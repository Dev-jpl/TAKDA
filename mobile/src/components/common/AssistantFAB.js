import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { Sparkle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';

export default function AssistantFAB() {
  const navigation = useNavigation();

  return (
    <TouchableOpacity 
      style={styles.fab} 
      onPress={() => navigation.navigate('Coordinator')}
      activeOpacity={0.8}
    >
      <View style={styles.inner}>
        <Sparkle color="#fff" size={24} weight="fill" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.modules.aly,
    shadowColor: colors.modules.aly,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
