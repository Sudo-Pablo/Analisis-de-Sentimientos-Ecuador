import { createContext, useContext, useState } from 'react'

const FilterContext = createContext()

export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    topic: 'all',
    dateFrom: '',
    dateTo: '',
    socialNetwork: 'all'
  })

  const updateFilter = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      topic: 'all',
      dateFrom: '',
      dateTo: '',
      socialNetwork: 'all'
    })
  }

  return (
    <FilterContext.Provider value={{ filters, updateFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}

export default FilterContext
