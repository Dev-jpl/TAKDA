import React from 'react'
import { View, StyleSheet } from 'react-native'
import * as PhosphorIcons from 'phosphor-react-native'

export default function SpaceIcon({
  icon = 'Folder',
  color = '#7F77DD',
  size = 44,
  iconSize = 22,
  weight = 'light',
  style,
}) {
  const IconComponent = PhosphorIcons[icon] || PhosphorIcons.Folder

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: color + '18',
        },
        style,
      ]}
    >
      <IconComponent
        size={iconSize}
        color={color}
        weight={weight}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})