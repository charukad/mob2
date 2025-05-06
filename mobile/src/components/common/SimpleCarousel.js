// src/components/common/SimpleCarousel.js
import React, { useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SimpleCarousel = ({ 
  data = [], 
  renderItem, 
  onSnapToItem,
  containerStyle = {},
  dotStyle = {},
  activeDotStyle = {},
  showControls = true
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = React.useRef(null);
  
  const handleScroll = (event) => {
    if (!event || !event.nativeEvent) return;
    
    const slideWidth = width;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / slideWidth);
    
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      if (onSnapToItem) onSnapToItem(newIndex);
    }
  };
  
  const goToSlide = (index) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: width * index, animated: true });
    }
  };
  
  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % data.length;
    goToSlide(nextIndex);
  };
  
  const handlePrevious = () => {
    const prevIndex = (activeIndex - 1 + data.length) % data.length;
    goToSlide(prevIndex);
  };
  
  if (!data || data.length === 0) {
    return <View style={[styles.container, containerStyle]} />;
  }
  
  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {data.map((item, index) => (
          <View key={index.toString()} style={styles.slide}>
            {renderItem && renderItem({ item, index })}
          </View>
        ))}
      </ScrollView>
      
      {data.length > 1 && (
        <View style={styles.pagination}>
          {data.map((_, index) => (
            <View
              key={index.toString()}
              style={[
                styles.dot, 
                dotStyle,
                activeIndex === index && styles.activeDot,
                activeIndex === index && activeDotStyle
              ]}
            />
          ))}
        </View>
      )}
      
      {showControls && data.length > 1 && (
        <>
          <TouchableOpacity style={[styles.control, styles.leftControl]} onPress={handlePrevious}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.control, styles.rightControl]} onPress={handleNext}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 250,
  },
  scrollView: {
    width,
  },
  slide: {
    width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    margin: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  control: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftControl: {
    left: 10,
  },
  rightControl: {
    right: 10,
  },
});

export default SimpleCarousel;