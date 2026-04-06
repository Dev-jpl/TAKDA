import React, { createContext, useContext, useRef } from 'react'

const AlySheetContext = createContext(null)

export function AlySheetProvider({ children, sheetRef }) {
  return (
    <AlySheetContext.Provider value={sheetRef}>
      {children}
    </AlySheetContext.Provider>
  )
}

// Call openSheet() from any screen to open the Aly drawer
export function useAlySheet() {
  const ref = useContext(AlySheetContext)
  return {
    openSheet: () => ref?.current?.(),
  }
}
