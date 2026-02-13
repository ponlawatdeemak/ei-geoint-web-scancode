import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

interface SearchCoordinateHelpDialogProps {
  open: boolean
  onClose: () => void
}

const SearchCoordinateHelpDialog: React.FC<SearchCoordinateHelpDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation('common')

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>{t('tools.searchCoordinateHelp.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
            {t('tools.searchCoordinateHelp.supportedSystems.title')}
          </Typography>
          <List dense disablePadding>
            {(t('tools.searchCoordinateHelp.supportedSystems.list', { returnObjects: true }) as string[]).map(
              (item, index) => (
                <ListItem key={index} disablePadding sx={{ pl: 2 }}>
                  <ListItemText primary={`• ${item}`} />
                </ListItem>
              ),
            )}
          </List>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
            {t('tools.searchCoordinateHelp.examples.title')}
          </Typography>
          <List dense disablePadding>
            <ListItem disablePadding sx={{ pl: 2, display: 'block' }}>
              <Typography component='span' variant='body2'>
                • {t('tools.searchCoordinateHelp.examples.gcs.label')}
              </Typography>
              <List dense disablePadding>
                <ListItem disablePadding sx={{ pl: 4 }}>
                  <ListItemText primary={`• ${t('tools.searchCoordinateHelp.examples.gcs.value')}`} />
                </ListItem>
              </List>
            </ListItem>
            <ListItem disablePadding sx={{ pl: 2, display: 'block' }}>
              <Typography component='span' variant='body2'>
                • {t('tools.searchCoordinateHelp.examples.utm.label')}
              </Typography>
              <List dense disablePadding>
                <ListItem disablePadding sx={{ pl: 4 }}>
                  <ListItemText primary={`• ${t('tools.searchCoordinateHelp.examples.utm.value')}`} />
                </ListItem>
              </List>
            </ListItem>
            <ListItem disablePadding sx={{ pl: 2, display: 'block' }}>
              <Typography component='span' variant='body2'>
                • {t('tools.searchCoordinateHelp.examples.mgrs.label')}
              </Typography>
              <List dense disablePadding>
                <ListItem disablePadding sx={{ pl: 4 }}>
                  <ListItemText primary={`• ${t('tools.searchCoordinateHelp.examples.mgrs.value')}`} />
                </ListItem>
              </List>
            </ListItem>
          </List>
        </Box>

        <Box>
          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
            {t('tools.searchCoordinateHelp.zoneExamples.title')}
          </Typography>
          <List dense disablePadding>
            {(t('tools.searchCoordinateHelp.zoneExamples.list', { returnObjects: true }) as string[]).map(
              (item, index) => (
                <ListItem key={index} disablePadding sx={{ pl: 2 }}>
                  <ListItemText primary={`• ${item}`} />
                </ListItem>
              ),
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='primary'>
          {t('button.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SearchCoordinateHelpDialog
