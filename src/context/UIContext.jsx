import { createContext, useContext, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [addMeasurementOpen, setAddMeasurementOpen] = useState(false)
  const [viewMeasurementsOpen, setViewMeasurementsOpen] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  // Contador que sube cada vez que se crea un evento exitosamente
  const [eventVersion, setEventVersion] = useState(0)

  const notifyEventCreated = () => setEventVersion((v) => v + 1)

  return (
    <UIContext.Provider
      value={{
        addMeasurementOpen,
        setAddMeasurementOpen,
        viewMeasurementsOpen,
        setViewMeasurementsOpen,
        addEventOpen,
        setAddEventOpen,
        eventVersion,
        notifyEventCreated,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
