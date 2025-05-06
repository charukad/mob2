import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, FONTS } from '../../constants/theme';

const CulturalInfoCard = ({ info, onPress }) => {
  const [expanded, setExpanded] = useState(false);

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Card style={styles.card}>
      {info.image && (
        <Card.Cover source={{ uri: info.image }} style={styles.coverImage} />
      )}
      
      <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{info.title}</Text>
          <Chip style={styles.categoryChip}>{info.category}</Chip>
        </View>
        
        <Text
          style={styles.description}
          numberOfLines={expanded ? undefined : 3}
        >
          {info.description}
        </Text>
        
        {info.description.length > 120 && (
          <TouchableOpacity onPress={toggleExpanded} style={styles.readMoreButton}>
            <Text style={styles.readMoreText}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        )}
        
        {expanded && info.details && (
          <View style={styles.detailsContainer}>
            {info.details.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <MaterialCommunityIcons
                  name="information"
                  size={16}
                  color={COLORS.primary}
                  style={styles.detailIcon}
                />
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ))}
          </View>
        )}
        
        {info.etiquette && expanded && (
          <View style={styles.etiquetteContainer}>
            <Text style={styles.sectionTitle}>Cultural Etiquette</Text>
            {info.etiquette.map((item, index) => (
              <View key={index} style={styles.etiquetteItem}>
                <MaterialCommunityIcons
                  name={item.do ? "check" : "close"}
                  size={16}
                  color={item.do ? COLORS.success : COLORS.error}
                  style={styles.etiquetteIcon}
                />
                <Text style={styles.etiquetteText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}
      </Card.Content>
      
      {onPress && (
        <Card.Actions style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => onPress(info)}
            style={styles.button}
          >
            Learn More
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    height: 160,
  },
  content: {
    padding: 8,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    ...FONTS.h3,
    flex: 1,
    marginRight: 8,
  },
  categoryChip: {
    backgroundColor: COLORS.primary,
  },
  description: {
    ...FONTS.body3,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  readMoreButton: {
    marginTop: 4,
    marginBottom: 8,
  },
  readMoreText: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  detailsContainer: {
    marginTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  detailText: {
    ...FONTS.body4,
    flex: 1,
  },
  etiquetteContainer: {
    marginTop: 16,
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    ...FONTS.h4,
    marginBottom: 8,
  },
  etiquetteItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  etiquetteIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  etiquetteText: {
    ...FONTS.body4,
    flex: 1,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingRight: 16,
    paddingBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
  },
});

export default CulturalInfoCard;