import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Searchbar,
  Chip,
  Text,
  ActivityIndicator,
  Appbar,
} from 'react-native-paper';

// Import components
import CulturalInfoCard from '../../components/events/CulturalInfoCard';
import EmptyState from '../../components/common/EmptyState';

// Import redux actions
import {
  fetchCulturalInfo,
  fetchCulturalCategories,
} from '../../store/slices/eventsSlice';

// Import theme
import { COLORS } from '../../constants/theme';

const CulturalInfoScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    culturalInfo,
    culturalCategories,
    loading,
    refreshing,
  } = useSelector(state => state.events);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Fetch cultural information when screen is focused
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCulturalInfo({ category: selectedCategory }));
      dispatch(fetchCulturalCategories());
    }, [dispatch, selectedCategory])
  );
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    dispatch(fetchCulturalInfo({ category: selectedCategory, refresh: true }));
    dispatch(fetchCulturalCategories());
  }, [dispatch, selectedCategory]);
  
  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };
  
  // Handle info card press
  const handleInfoPress = (info) => {
    navigation.navigate('CulturalInfoDetail', { infoId: info._id });
  };
  
  // Filter info items by search query
  const getFilteredInfo = () => {
    if (!culturalInfo) return [];
    if (!searchQuery.trim()) return culturalInfo;
    
    const query = searchQuery.toLowerCase();
    return culturalInfo.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query))
    );
  };
  
  const filteredInfo = getFilteredInfo();
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Cultural Information" />
      </Appbar.Header>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search cultural information"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>
      
      {/* Categories */}
      {culturalCategories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            data={culturalCategories}
            renderItem={({ item }) => (
              <Chip
                selected={selectedCategory === item}
                onPress={() => handleCategorySelect(item)}
                style={styles.categoryChip}
                selectedColor={COLORS.primary}
              >
                {item}
              </Chip>
            )}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}
      
      {/* Info List */}
      <FlatList
        data={filteredInfo}
        renderItem={({ item }) => (
          <CulturalInfoCard info={item} onPress={handleInfoPress} />
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <EmptyState
              icon="book-open-page-variant"
              title="No information found"
              message={
                searchQuery
                  ? "Try different search terms"
                  : selectedCategory 
                    ? "No information in this category"
                    : "No cultural information available"
              }
              actionLabel={selectedCategory ? "Clear Filter" : null}
              onAction={selectedCategory ? () => setSelectedCategory(null) : null}
            />
          )
        }
        ListFooterComponent={
          loading && filteredInfo.length > 0 ? (
            <ActivityIndicator
              color={COLORS.primary}
              size="large"
              style={styles.loadingFooter}
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
    borderRadius: 8,
  },
  categoriesContainer: {
    paddingBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: 16,
  },
});

export default CulturalInfoScreen;