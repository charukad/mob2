import React from 'react';
import { StyleSheet } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { colors, spacing } from '../../constants/theme';

const Card = ({
  title,
  subtitle,
  children,
  style,
  contentStyle,
  onPress,
  cover,
  actions,
}) => {
  return (
    <PaperCard
      style={[styles.card, style]}
      onPress={onPress}
    >
      {cover && <PaperCard.Cover source={cover} />}
      
      {(title || subtitle) && (
        <PaperCard.Title
          title={title}
          subtitle={subtitle}
          titleStyle={styles.title}
          subtitleStyle={styles.subtitle}
        />
      )}
      
      <PaperCard.Content style={[styles.content, contentStyle]}>
        {children}
      </PaperCard.Content>
      
      {actions && <PaperCard.Actions>{actions}</PaperCard.Actions>}
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  content: {
    paddingVertical: spacing.sm,
  },
});

export default Card;