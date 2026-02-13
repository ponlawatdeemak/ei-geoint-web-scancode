import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import InboxIcon from '@mui/icons-material/Inbox' // หรือใช้ PhotoCameraIcon

type NoDataPlaceholderProps = { text: string }

const NoDataPlaceholder: React.FC<NoDataPlaceholderProps> = ({ text }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column', // จัดเรียงแนวตั้ง
        alignItems: 'center', // จัดให้อยู่กึ่งกลางแนวนอน
        justifyContent: 'center', // จัดให้อยู่กึ่งกลางแนวตั้ง
        width: '100%',
        height: 200, // กำหนดความสูงตามต้องการ
        color: 'text.secondary', // ใช้สีรองของ Theme (มักจะเป็นสีเทา)
      }}
    >
      {/* ไอคอน */}
      <InboxIcon sx={{ fontSize: 80 }} />

      {/* ข้อความ */}
      <Typography variant='body2' sx={{ mt: 1 }}>
        {' '}
        {/* mt: 1 คือ margin-top */}
        {text}
      </Typography>
    </Box>
  )
}

export default NoDataPlaceholder
