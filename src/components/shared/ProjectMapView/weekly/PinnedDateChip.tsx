import React, { use, useMemo } from 'react'
import Chip from '@mui/material/Chip'
import PushPinIcon from '@mui/icons-material/PushPin'
import CloseIcon from '@mui/icons-material/Close'
import { grey } from '@mui/material/colors'
import { formatDate } from '@/utils/formatDate'
import { useSettings } from '@/hook/useSettings'

type PinnedDateChipProps = {
  date: string
  onDelete: () => void
}

/**
 * A custom Chip component that displays a pinned date.
 * It matches the style from the user's image, featuring a pushpin icon,
 * a date label, and a close icon.
 */
const PinnedDateChip: React.FC<PinnedDateChipProps> = ({ date, onDelete }) => {
  const { language } = useSettings()

  const dateLabel = useMemo(() => {
    const d = formatDate(date, language, true)
    // check invalid date
    if (!d || d === 'Invalid Date' || d.includes('Invalid')) {
      return date
    }
    return d
  }, [date, language])

  return (
    <Chip
      // 1. Icon on the left
      icon={<PushPinIcon sx={{ color: grey[700] }} />}
      // 2. The text content
      label={dateLabel}
      // 3. The "X" icon on the right
      deleteIcon={<CloseIcon sx={{ color: grey[700] }} />}
      // 4. The function to call when the delete icon is clicked
      onDelete={onDelete}
      // 5. Custom styling via the `sx` prop to match the image
      sx={{
        bgcolor: '#ffffff', // White backgroundด
        borderRadius: '999px', // Fully rounded "pill" shape
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Subtle shadow like in the image
        border: `1px solid ${grey[300]}`, // Faint border
        fontWeight: 500, // Slightly bolder text
        fontSize: '0.9rem', // Adjust font size

        // Adjust icon spacing
        '& .MuiChip-icon': {
          marginLeft: '8px',
        },
        '& .MuiChip-deleteIcon': {
          marginRight: '8px',
          // Optional: change color on hover
          '&:hover': {
            color: grey[900],
          },
        },
      }}
    />
  )
}

export default PinnedDateChip
