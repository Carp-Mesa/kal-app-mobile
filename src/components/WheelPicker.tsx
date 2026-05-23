import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;
const PADDING_ITEMS = Math.floor(VISIBLE_ROWS / 2); // 1
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SELECTOR_TOP = ITEM_HEIGHT * PADDING_ITEMS;

interface WheelPickerProps {
  data: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  style?: any;
}

// ─── Memoized Item ───────────────────────────────────────────────────────────

const WheelPickerItem = memo(({ item, isSelected }: { item: string; isSelected: boolean }) => (
  <View style={[styles.item, { height: ITEM_HEIGHT }]}>
    <Text style={[styles.itemText, isSelected && styles.selectedText]}>{item}</Text>
  </View>
));

WheelPickerItem.displayName = 'WheelPickerItem';

// ─── Main Component ─────────────────────────────────────────────────────────

export const WheelPicker: React.FC<WheelPickerProps> = memo(({
  data,
  selectedIndex,
  onChange,
  width = 60,
  style,
}) => {
  const flatListRef = useRef<FlatList<string>>(null);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  // Sync with prop changes (e.g. modal reset)
  useEffect(() => {
    if (
      flatListRef.current &&
      selectedIndex >= 0 &&
      selectedIndex < data.length &&
      selectedIndex !== currentIndex
    ) {
      flatListRef.current.scrollToIndex({ index: selectedIndex, animated: true });
      setCurrentIndex(selectedIndex);
    }
  }, [selectedIndex, data.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force scroll to initial selectedIndex on mount (e.g. inside lazy modal containers)
  useEffect(() => {
    if (selectedIndex > 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    if (clamped !== currentIndex) {
      setCurrentIndex(clamped);
      onChange(clamped);
    }
  }, [currentIndex, data.length, onChange]);

  const renderItem = useCallback(({ item, index }: { item: string; index: number }) => {
    const isSelected = index === currentIndex;
    return <WheelPickerItem item={item} isSelected={isSelected} />;
  }, [currentIndex]);

  return (
    <View style={[styles.container, { width, height: CONTAINER_HEIGHT }, style]}>
      {/* Subtle glow behind the selected row */}
      <View style={[styles.glow, { top: SELECTOR_TOP }]} pointerEvents="none" />
      {/* Selection border lines */}
      <View style={[styles.selector, { top: SELECTOR_TOP }]} pointerEvents="none" />

      <FlatList
        ref={flatListRef}
        data={data}
        initialScrollIndex={selectedIndex}
        renderItem={renderItem}
        keyExtractor={(_, index) => `wp-${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        onScrollToIndexFailed={() => {}}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_ITEMS }}
        removeClippedSubviews={true}
        extraData={currentIndex}
        scrollEventThrottle={16}
        disableIntervalMomentum={false}
        overScrollMode="never"
      />
    </View>
  );
});

WheelPicker.displayName = 'WheelPicker';

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  glow: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(204,255,0,0.06)',
    zIndex: 5,
  },
  selector: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(204,255,0,0.25)',
    zIndex: 10,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedText: {
    color: '#CCFF00',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
