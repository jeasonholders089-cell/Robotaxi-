import { create } from 'zustand'
import type { FilterState } from '@/types'

interface FilterStore {
  filters: FilterState
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  setRatingRange: (min: number, max: number) => void
  setCities: (cities: string[]) => void
  setFeedbackTypes: (types: string[]) => void
  setStatuses: (statuses: string[]) => void
  setDateRange: (startDate: string | null, endDate: string | null) => void
  setKeyword: (keyword: string) => void
}

const initialFilters: FilterState = {
  city: [],
  route: null,
  ratingMin: 1,
  ratingMax: 5,
  startDate: null,
  endDate: null,
  feedbackType: [],
  status: [],
  keyword: '',
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: initialFilters,

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () =>
    set(() => ({
      filters: initialFilters,
    })),

  setRatingRange: (min, max) =>
    set((state) => ({
      filters: { ...state.filters, ratingMin: min, ratingMax: max },
    })),

  setCities: (cities) =>
    set((state) => ({
      filters: { ...state.filters, city: cities },
    })),

  setFeedbackTypes: (feedbackType) =>
    set((state) => ({
      filters: { ...state.filters, feedbackType },
    })),

  setStatuses: (status) =>
    set((state) => ({
      filters: { ...state.filters, status },
    })),

  setDateRange: (startDate, endDate) =>
    set((state) => ({
      filters: { ...state.filters, startDate, endDate },
    })),

  setKeyword: (keyword) =>
    set((state) => ({
      filters: { ...state.filters, keyword },
    })),
}))
