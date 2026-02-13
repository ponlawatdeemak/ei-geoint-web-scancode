'use client'

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

const barData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Active Users',
      data: [120, 150, 90, 180, 220, 130, 170],
      backgroundColor: '#2563eb',
      borderRadius: 6,
    },
  ],
}

const lineData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    {
      label: 'Revenue',
      data: [12, 19, 15, 25, 22, 30, 28],
      fill: false,
      borderColor: '#16a34a',
      backgroundColor: '#16a34a',
      tension: 0.35,
      pointRadius: 4,
    },
  ],
}

function GaugeChart() {
  const value = 70
  const total = 100

  return (
    <div className='relative h-40 w-full max-w-xl'>
      <Doughnut
        data={{
          datasets: [
            {
              data: [70, total],
              backgroundColor: ['#0E94FA', '#d1d5db'],
              borderWidth: 0,
              circumference: 180,
              rotation: 270,
            },
            {
              data: [value, total - value],
              backgroundColor: ['#56B4FB', '#d1d5db'],
              borderWidth: 0,
              circumference: 180,
              rotation: 270,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        }}
      />

      <div className='absolute inset-0 flex items-center justify-center pb-2'>
        <div className='font-bold text-2xl'>{value}%</div>
      </div>
    </div>
  )
}

function CircleProgress() {
  const value = 8
  const total = 10
  const percent = (value / total) * 100

  return (
    <div className='relative h-32 w-32'>
      <Doughnut
        data={{
          datasets: [
            {
              data: [value, total - value],
              backgroundColor: ['#2563eb', '#e5e7eb'],
              borderWidth: 0,
            },
          ],
        }}
        options={{ cutout: '75%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }}
      />

      <div className='absolute inset-0 flex flex-col items-center justify-center'>
        <div className='font-bold text-xl'>{percent.toFixed(0)}%</div>
        <div className='text-gray-500 text-xs'>
          {value}/{total}
        </div>
      </div>
    </div>
  )
}

function DoubleRingProgress() {
  const outerValue = 72
  const innerValue = 45
  const total = 100

  return (
    <div className='relative h-40 w-40'>
      <Doughnut
        data={{
          datasets: [
            {
              data: [outerValue, total - outerValue],
              backgroundColor: ['#2563eb', '#e5e7eb'],
              borderWidth: 0,
            },
            {
              data: [innerValue, total - innerValue],
              backgroundColor: ['#f59e0b', '#fff7ed'],
              borderWidth: 0,
            },
          ],
        }}
        options={{ cutout: '60%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }}
      />

      <div className='absolute inset-0 flex flex-col items-center justify-center text-center'>
        <div className='font-bold text-2xl'>{outerValue}%</div>
        <div className='text-gray-500 text-xs'>เป้าหมายหลัก</div>
      </div>
    </div>
  )
}

export default function ChartPlaygroundPage() {
  return (
    <div className='space-y-6 p-6'>
      <header className='space-y-1'>
        <h1 className='font-semibold text-2xl'>Chart.js Playground</h1>
        <p className='text-gray-500 text-sm'>ตัวอย่างการใช้งาน chart.js ผ่าน react-chartjs-2</p>
      </header>

      <div className='grid gap-6 md:grid-cols-2'>
        <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-semibold text-lg'>Gauge (semi-circle)</h2>
            <span className='text-gray-500 text-xs'>ตัวอย่างตาม Chart.js gauge</span>
          </div>
          <div className='flex items-center gap-6'>
            <GaugeChart />
            <p className='text-gray-600 text-sm'>เกจครึ่งวงสีฟ้า + แทร็กเทา และเปอร์เซ็นต์ตรงกลาง</p>
          </div>
        </section>

        <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-semibold text-lg'>Double ring progress</h2>
            <span className='text-gray-500 text-xs'>วงแหวน 2 ชั้น + ข้อความ%</span>
          </div>
          <div className='flex items-center gap-6'>
            <DoubleRingProgress />
            <p className='text-gray-600 text-sm'>ตัวอย่างวงแหวน 2 ชั้น แสดง % เป้าหมายหลักไว้ตรงกลาง</p>
          </div>
        </section>

        <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-semibold text-lg'>Single ring progress</h2>
            <span className='text-gray-500 text-xs'>วงแหวนชั้นเดียว + ข้อความ%</span>
          </div>
          <div className='flex items-center gap-6'>
            <CircleProgress />
            <p className='text-gray-600 text-sm'>วงแหวนชั้นเดียว พร้อมค่า 8/10 และ % อยู่ตรงกลาง</p>
          </div>
        </section>
      </div>
    </div>
  )
}
