const Message = require('../src/models/Message');
const Conversation = require('../src/models/Conversation');
const User = require('../src/models/User');
const { successResponse } = require('../src/utils/responseWrapper');
const errorResponse = require('../src/utils/errorResponse');

/**
 * Get all conversations for the current user
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`Fetching conversations for user ${userId}`);
    
    // Find conversations where current user is a participant
    const conversations = await Conversation.find({
      $or: [
        { senderId: userId },
        { recipientId: userId },
        { participants: userId }
      ]
    })
    .populate({
      path: 'senderId',
      select: 'firstName lastName email profileImage role',
      model: 'User'
    })
    .populate({
      path: 'recipientId',
      select: 'firstName lastName email profileImage role',
      model: 'User'
    })
    .populate('participants', 'firstName lastName email profileImage role')
    .populate('vehicleId', 'title make model photos')
    .sort({ updatedAt: -1 });
    
    console.log(`Found ${conversations.length} conversations for user ${userId}`);
    
    // Get the ProfileImage model
    const ProfileImage = require('../src/models/ProfileImage');
    
    // Process conversations to add extra information
    const processedConversations = await Promise.all(conversations.map(async conversation => {
      const conversationObj = conversation.toObject();
      
      // Determine the other participant (for one-on-one chats)
      let otherParticipant;
      if (conversationObj.senderId && conversationObj.recipientId) {
        const isUserSender = conversationObj.senderId._id.toString() === userId.toString();
        otherParticipant = isUserSender ? conversationObj.recipientId : conversationObj.senderId;
        conversationObj.participant = otherParticipant;
      }
      
      // Get profile image from Cloudinary if available
      if (otherParticipant && otherParticipant.email) {
        try {
          const profileImage = await ProfileImage.findOne({ 
            email: otherParticipant.email,
            isActive: true
          });
          
          if (profileImage) {
            console.log(`Found profile image for ${otherParticipant.email}`);
            conversationObj.participant.cloudinaryImage = profileImage.imageUrl;
          }
        } catch (err) {
          console.error(`Error fetching profile image for ${otherParticipant.email}:`, err);
        }
      }
      
      // Format participant names properly
      if (conversationObj.participant) {
        const participant = conversationObj.participant;
        // Format name properly using firstName and lastName
        participant.name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
        
        // Add role-specific information
        if (participant.role === 'vehicleOwner') {
          participant.displayRole = 'Vehicle Owner';
        } else if (participant.role === 'guide') {
          participant.displayRole = 'Guide';
        } else if (participant.role === 'tourist') {
          participant.displayRole = 'Tourist';
        } else {
          participant.displayRole = participant.role || 'User';
        }
      }
      
      // Include vehicle information if present
      if (conversationObj.vehicleId) {
        const vehicle = conversationObj.vehicleId;
        // Format vehicle name
        conversationObj.vehicleName = vehicle.make && vehicle.model 
          ? `${vehicle.make} ${vehicle.model}` 
          : (vehicle.title || 'Vehicle');
      }
      
      return conversationObj;
    }));
    
    return successResponse(res, { conversations: processedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get messages for a specific conversation
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    console.log(`User ${userId} requesting messages for conversation ${conversationId}`);
    
    // First verify the user is a participant in this conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      console.log(`Conversation ${conversationId} not found`);
      return errorResponse(res, 'Conversation not found', 404);
    }
    
    // Get the user's email as an additional identifier
    const currentUser = await User.findById(userId);
    const userEmail = currentUser ? currentUser.email : null;
    
    // Check if user is a participant using the helper method or by email
    let isParticipant = conversation.isParticipant(userId);
    
    if (!isParticipant) {
      console.log(`User ${userId} is not a participant in conversation ${conversationId}`);
      return errorResponse(res, 'You do not have permission to view this conversation', 403);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log(`Finding messages for user ${userId}, email: ${userEmail || 'unknown'}`);
    
    // Fetch messages that belong to this conversation AND where the user is either:
    // 1. The sender OR
    // 2. The intended recipient
    // Use both ID and email as identifiers
    const messages = await Message.find({
      conversationId,
      $or: [
        { senderId: userId },
        { recipientId: userId },
        ...(userEmail ? [{ senderEmail: userEmail }, { recipientEmail: userEmail }] : [])
      ]
    })
      .populate({
        path: 'senderId',
        select: 'firstName lastName email profileImage role',
        model: 'User'
      })
      .populate({
        path: 'recipientId',
        select: 'firstName lastName email profileImage role',
        model: 'User'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log(`Found ${messages.length} messages for conversation ${conversationId}`);
    
    // Update read status for messages sent to this user
    const updateResult = await Message.updateMany(
      { 
        conversationId,
        recipientId: userId,
        isRead: false
      },
      { isRead: true }
    );
    
    console.log(`Marked ${updateResult.nModified || updateResult.modifiedCount || 0} messages as read`);
    
    // Get the ProfileImage model
    const ProfileImage = require('../src/models/ProfileImage');
    
    // Process messages to add profile images and format names
    const processedMessages = await Promise.all(messages.map(async message => {
      const messageObj = message.toObject();
      
      // Format sender info
      if (messageObj.senderId) {
        const sender = messageObj.senderId;
        // Format name
        sender.name = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
        
        // Get Cloudinary profile image if available
        if (sender.email) {
          try {
            const profileImage = await ProfileImage.findOne({
              email: sender.email,
              isActive: true
            });
            
            if (profileImage) {
              sender.cloudinaryImage = profileImage.imageUrl;
            }
          } catch (err) {
            console.error(`Error fetching sender profile image:`, err);
          }
        }
      }
      
      // Format recipient info
      if (messageObj.recipientId) {
        const recipient = messageObj.recipientId;
        // Format name
        recipient.name = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim();
        
        // Get Cloudinary profile image if available
        if (recipient.email) {
          try {
            const profileImage = await ProfileImage.findOne({
              email: recipient.email,
              isActive: true
            });
            
            if (profileImage) {
              recipient.cloudinaryImage = profileImage.imageUrl;
            }
          } catch (err) {
            console.error(`Error fetching recipient profile image:`, err);
          }
        }
      }
      
      return messageObj;
    }));
    
    return successResponse(res, { messages: processedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Send a new message
 */
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const senderEmail = req.user.email;
    const { recipientId, text, conversationId, vehicleId, metadata } = req.body;
    
    console.log(`User ${senderId} (${senderEmail}) sending message to recipient ${recipientId} with vehicleId ${vehicleId || 'none'}`);
    console.log(`Message body: ${JSON.stringify(req.body, null, 2)}`);
    
    if (!recipientId && !conversationId) {
      return errorResponse(res, 'Either recipientId or conversationId is required', 400);
    }
    
    if (!text) {
      return errorResponse(res, 'Message text is required', 400);
    }
    
    let conversation;
    let messageRecipientId;
    
    // If conversationId is provided, verify it exists and user has access
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        console.log(`Conversation ${conversationId} not found`);
        return errorResponse(res, 'Conversation not found', 404);
      }
      
      // Verify the user is a participant
      const isParticipant = conversation.isParticipant(senderId);
        
      if (!isParticipant) {
        console.log(`User ${senderId} is not a participant in conversation ${conversationId}`);
        return errorResponse(res, 'You are not a participant in this conversation', 403);
      }
      
      // Determine the recipient based on sender
      if (conversation.senderId.equals(senderId)) {
        messageRecipientId = conversation.recipientId;
      } else if (conversation.recipientId.equals(senderId)) {
        messageRecipientId = conversation.senderId;
      } else {
        // If it's a group chat and senderId is in participants, set recipient to null
        // This is a placeholder for group chat functionality
        messageRecipientId = null;
      }
    } 
    // If no conversationId, create a new conversation
    else {
      console.log(`Creating new conversation between ${senderId} and ${recipientId}`);
      
      // Check if there's an existing conversation between these users
      const existingConversation = await Conversation.findOne({
        $or: [
          { senderId, recipientId },
          { senderId: recipientId, recipientId: senderId }
        ],
        vehicleId: vehicleId || { $exists: false }
      });
      
      if (existingConversation) {
        console.log(`Found existing conversation: ${existingConversation._id}`);
        conversation = existingConversation;
      } else {
        // Create new conversation
        conversation = new Conversation({
          senderId,
          recipientId,
          vehicleId,
          lastMessage: text,
          lastMessageDate: new Date()
        });
        
        await conversation.save();
        console.log(`Created new conversation: ${conversation._id}`);
      }
      
      messageRecipientId = recipientId;
    }
    
    // Get user email information for both sender and recipient
    const sender = await User.findById(senderId);
    const recipient = await User.findById(messageRecipientId);
    
    // Create the message with the correct recipient and email identifiers
    const message = new Message({
      text,
      senderId,
      senderEmail: sender ? sender.email : null,
      recipientId: messageRecipientId,
      recipientEmail: recipient ? recipient.email : null,
      conversationId: conversation._id,
      vehicleId,
      metadata
    });
    
    console.log(`Message created with vehicleId: ${vehicleId || 'none'}, recipient: ${messageRecipientId}, recipientEmail: ${recipient?.email || 'unknown'}`); 
    
    await message.save();
    console.log(`Created new message: ${message._id}`);
    
    // Update the conversation's last message
    conversation.lastMessage = text;
    conversation.lastMessageDate = new Date();
    conversation.updatedAt = new Date();
    await conversation.save();
    
    // Populate user info for the response
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name username email profileImage')
      .populate('recipientId', 'name username email profileImage');
    
    return successResponse(res, { 
      message: populatedMessage, 
      conversationId: conversation._id 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    
    console.log(`User ${userId} marking messages as read in conversation ${conversationId}`);
    
    // First verify the user is a participant in this conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      console.log(`Conversation ${conversationId} not found`);
      return errorResponse(res, 'Conversation not found', 404);
    }
    
    // Get the user's email as an additional identifier
    const currentUser = await User.findById(userId);
    const userEmail = currentUser ? currentUser.email : null;
    
    // Check if user is a participant using the helper method or by email
    let isParticipant = conversation.isParticipant(userId);
    
    if (!isParticipant) {
      console.log(`User ${userId} is not a participant in conversation ${conversationId}`);
      return errorResponse(res, 'You do not have permission to access this conversation', 403);
    }
    
    // Create query to update messages - only mark messages where this user is the recipient
    const query = { 
      conversationId,
      recipientId: userId,
      isRead: false
    };
    
    // If specific message IDs provided, add to query
    if (messageIds && messageIds.length > 0) {
      console.log(`Marking specific message IDs: ${messageIds.join(', ')}`);
      query._id = { $in: messageIds };
    }
    
    // Update read status
    const result = await Message.updateMany(query, { isRead: true });
    const updatedCount = result.nModified || result.modifiedCount || 0;
    
    console.log(`Marked ${updatedCount} messages as read`);
    
    // Update conversation's readStatus array 
    if (updatedCount > 0) {
      // Find the user's read status entry or create one
      const readStatusEntry = conversation.readStatus.find(
        entry => entry.userId.toString() === userId.toString()
      );
      
      if (readStatusEntry) {
        readStatusEntry.lastRead = new Date();
      } else {
        conversation.readStatus.push({
          userId,
          lastRead: new Date()
        });
      }
      
      await conversation.save();
      console.log(`Updated conversation read status for user ${userId}`);
    }
    
    return successResponse(res, { 
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete a message (soft delete)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    
    console.log(`User ${userId} attempting to delete message ${messageId}`);
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.log(`Message ${messageId} not found`);
      return errorResponse(res, 'Message not found', 404);
    }
    
    // Only sender can delete a message
    if (!message.senderId.equals(userId)) {
      console.log(`User ${userId} is not the sender of message ${messageId}`);
      return errorResponse(res, 'You do not have permission to delete this message', 403);
    }
    
    // Verify the user is a participant in the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      console.log(`User ${userId} is not a participant in conversation ${message.conversationId}`);
      return errorResponse(res, 'You do not have permission to delete this message', 403);
    }
    
    // Soft delete by updating isDeleted flag
    message.isDeleted = true;
    await message.save();
    
    console.log(`Message ${messageId} marked as deleted`);
    
    // If this was the last message in the conversation, update the conversation's last message
    const latestMessage = await Message.findOne({
      conversationId: message.conversationId,
      isDeleted: false
    }).sort({ createdAt: -1 });
    
    if (latestMessage) {
      conversation.lastMessage = latestMessage.text;
      conversation.lastMessageDate = latestMessage.createdAt;
    } else {
      conversation.lastMessage = '[Message deleted]';
    }
    
    await conversation.save();
    
    return successResponse(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return errorResponse(res, error.message, 500);
  }
}; 