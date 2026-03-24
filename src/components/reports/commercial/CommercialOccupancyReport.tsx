'use client'

// This re-exports the original occupancy report logic, now as a named component
// so it can be composed by OccupancyReportSwitcher or used standalone.
// The original file at src/app/(dashboard)/reports/occupancy/page.tsx is preserved.
// This component wraps the same logic for modular use.

export { default } from '@/app/(dashboard)/reports/occupancy/page'
