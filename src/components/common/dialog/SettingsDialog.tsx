import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useSettings, languageFlags } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import InputLabel from '@/components/common/input/InputLabel'
import { Divider } from '@mui/material'
import useResponsive from '@/hook/responsive'

export const areaUnits = [
  { code: 'rai', label: 'unit.area.rai', abbr: 'unit.area.raiAbbr' },
  { code: 'sqm', label: 'unit.area.sqm', abbr: 'unit.area.sqmAbbr' },
  { code: 'sqkm', label: 'unit.area.sqkm', abbr: 'unit.area.sqkmAbbr' },
  { code: 'hectare', label: 'unit.area.hectare', abbr: 'unit.area.hectareAbbr' },
  { code: 'acre', label: 'unit.area.acre', abbr: 'unit.area.acreAbbr' },
  { code: 'sqmile', label: 'unit.area.sqmile', abbr: 'unit.area.sqmileAbbr' },
  { code: 'sqnauticmile', label: 'unit.area.sqnauticmile', abbr: 'unit.area.sqnauticmileAbbr' },
]
export const lengthUnits = [
  { code: 'foot', label: 'unit.length.foot', abbr: 'unit.length.footAbbr' },
  { code: 'nauticmile', label: 'unit.length.nauticmile', abbr: 'unit.length.nauticmileAbbr' },
  { code: 'mile', label: 'unit.length.mile', abbr: 'unit.length.mileAbbr' },
  { code: 'yard', label: 'unit.length.yard', abbr: 'unit.length.yardAbbr' },
  { code: 'meter', label: 'unit.length.meter', abbr: 'unit.length.meterAbbr' },
  { code: 'km', label: 'unit.length.km', abbr: 'unit.length.kmAbbr' },
]

const SettingsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useTranslation('common')
  const { language, setLanguage, areaUnit, setAreaUnit, lengthUnit, setLengthUnit } = useSettings()
  const [form, setForm] = useState({ language, areaUnit, lengthUnit })
  const { is2K } = useResponsive()

  useEffect(() => {
    if (open) {
      setForm({ language, areaUnit, lengthUnit })
    }
  }, [open, language, areaUnit, lengthUnit])

  const handleSave = () => {
    setLanguage(form.language)
    setAreaUnit(form.areaUnit)
    setLengthUnit(form.lengthUnit)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth={is2K ? 'md' : 'xs'} fullWidth>
      <DialogTitle>{t('form.settings.formTitle')}</DialogTitle>
      <DialogContent>
        <div className='grid gap-2'>
          <div>
            <InputLabel>{t('form.settings.language')}</InputLabel>
            <div className='flex gap-2'>
              <Button
                className='flex-1'
                variant={form.language === 'th' ? 'contained' : 'outlined'}
                onClick={() => setForm((f) => ({ ...f, language: 'th' }))}
              >
                {t('language.thai')}
                <div className='relative ml-2 h-6 w-6 overflow-hidden rounded-full'>
                  <Image className='object-cover' src={languageFlags.th} alt='TH' fill />
                </div>
              </Button>
              <Button
                className='flex-1'
                variant={form.language === 'en' ? 'contained' : 'outlined'}
                color='primary'
                onClick={() => setForm((f) => ({ ...f, language: 'en' }))}
              >
                {t('language.english')}
                <div className='relative ml-2 h-6 w-6 overflow-hidden rounded-full'>
                  <Image className='object-cover' src={languageFlags.en} alt='EN' fill />
                </div>
              </Button>
            </div>
          </div>
          <div>
            <InputLabel>{t('form.settings.areaUnit')}</InputLabel>
            <Select value={form.areaUnit} onChange={(e) => setForm((f) => ({ ...f, areaUnit: e.target.value }))}>
              {areaUnits.map((unit) => (
                <MenuItem key={unit.code} value={unit.code}>
                  {t(unit.label)}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <InputLabel>{t('form.settings.lengthUnit')}</InputLabel>
            <Select value={form.lengthUnit} onChange={(e) => setForm((f) => ({ ...f, lengthUnit: e.target.value }))}>
              {lengthUnits.map((unit) => (
                <MenuItem key={unit.code} value={unit.code}>
                  {t(unit.label)}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>
      </DialogContent>
      <Divider className='mx-6!' />
      <DialogActions className='p-6! pt-4!'>
        <Button className='flex-1' variant='outlined' onClick={onClose}>
          {t('button.cancel')}
        </Button>
        <Button className='flex-1' variant='contained' color='primary' onClick={handleSave}>
          {t('button.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog
