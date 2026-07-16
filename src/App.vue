<script setup lang="ts">
import type { EChartsCoreOption } from 'echarts/core'
import { Activity, AlertTriangle, Bus, Camera, CarFront, Gauge, Layers3, LocateFixed, Moon, Radio, RotateCcw, Route, ShieldCheck, Sun } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import CityScene from './components/CityScene.vue'
import EChart from './components/EChart.vue'
import type { DistrictData, TrafficEvent, TrafficMode } from './types'

const mode = ref<TrafficMode>('overview')
const theme = ref<'dark' | 'light'>((localStorage.getItem('lanjiang-theme') as 'dark' | 'light') || 'dark')
const selectedDistrict = ref('全市路网')
const tick = ref(0)
const now = ref(new Date())

const modes: { value: TrafficMode; label: string; icon: typeof Layers3 }[] = [
  { value: 'overview', label: '全局态势', icon: Layers3 },
  { value: 'congestion', label: '拥堵研判', icon: Route },
  { value: 'transit', label: '公交运行', icon: Bus },
  { value: 'incident', label: '事件处置', icon: AlertTriangle },
]

const events: TrafficEvent[] = [
  { id: 1, time: '18:42', title: '两车追尾', location: '云港大道与环城路', level: '紧急', status: '处置中' },
  { id: 2, time: '18:38', title: '车流量突增', location: '滨江隧道北口', level: '警告', status: '已派警' },
  { id: 3, time: '18:31', title: '信号灯离线', location: '科创路 3 号路口', level: '警告', status: '检修中' },
  { id: 4, time: '18:24', title: '施工缓行', location: '东湖高架西向', level: '提示', status: '监测中' },
]

const districts = computed<DistrictData[]>(() => {
  const pulse = Math.sin(tick.value / 4)
  return [
    { name: '中央商务区', speed: 23 + pulse * 2, flow: 8460, efficiency: 68 },
    { name: '云港片区', speed: 27 - pulse, flow: 7250, efficiency: 74 },
    { name: '滨江片区', speed: 34 + pulse, flow: 6340, efficiency: 82 },
    { name: '北站枢纽', speed: 31 - pulse, flow: 5890, efficiency: 78 },
    { name: '科创片区', speed: 39 + pulse, flow: 4720, efficiency: 89 },
  ]
})

const intensity = computed(() => 0.78 + Math.sin(tick.value / 5) * 0.1)
const currentTime = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))
const currentDate = computed(() => now.value.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }))

const kpis = computed(() => [
  { label: '今日车流量', value: `${(128.6 + tick.value % 5 * 0.1).toFixed(1)}万`, delta: '+8.2%', icon: CarFront },
  { label: '路网平均车速', value: `${(32.8 + Math.sin(tick.value / 4)).toFixed(1)}`, unit: 'km/h', delta: '-3.1%', icon: Gauge },
  { label: '全市拥堵指数', value: `${(1.72 + Math.sin(tick.value / 6) * 0.08).toFixed(2)}`, delta: '中度', icon: Activity },
  { label: '在线感知设备', value: '2,846', unit: '台', delta: '99.2%', icon: Camera },
  { label: '待处置事件', value: '12', unit: '起', delta: '3 起紧急', icon: AlertTriangle },
])

const chartTheme = computed(() => theme.value === 'light'
  ? { text: '#617174', axis: '#b7c5c5', split: '#dfe7e6', tooltipBg: '#ffffffee', tooltipBorder: '#c8d4d3', tooltipText: '#263536', barBg: '#e4ebea' }
  : { text: '#829598', axis: '#26383b', split: '#172629', tooltipBg: '#101719ee', tooltipBorder: '#33484b', tooltipText: '#d9e6e5', barBg: '#172326' })
const commonText = computed(() => ({ color: chartTheme.value.text, fontFamily: 'Inter, Microsoft YaHei, sans-serif' }))
const tooltip = computed(() => ({ trigger: 'axis' as const, backgroundColor: chartTheme.value.tooltipBg, borderColor: chartTheme.value.tooltipBorder, textStyle: { color: chartTheme.value.tooltipText } }))

const trendOption = computed<EChartsCoreOption>(() => ({
  tooltip: tooltip.value,
  grid: { left: 10, right: 8, top: 22, bottom: 4, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: ['00', '03', '06', '09', '12', '15', '18', '21'], axisLine: { lineStyle: { color: chartTheme.value.axis } }, axisLabel: commonText.value },
  yAxis: { type: 'value', min: 0.8, max: 2.4, splitNumber: 3, axisLabel: commonText.value, splitLine: { lineStyle: { color: chartTheme.value.split } } },
  series: [{
    type: 'line', smooth: true, symbol: 'none', data: [0.9, 0.82, 1.18, 2.05, 1.42, 1.55, 2.12 + Math.sin(tick.value / 5) * 0.08, 1.64],
    lineStyle: { color: '#f0bd5d', width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f0bd5d55' }, { offset: 1, color: '#f0bd5d00' }] } },
    markLine: { silent: true, symbol: 'none', label: { show: false }, lineStyle: { color: '#d85d5644', type: 'dashed' }, data: [{ yAxis: 2 }] },
  }],
}))

const rankOption = computed<EChartsCoreOption>(() => ({
  grid: { left: 2, right: 30, top: 5, bottom: 0, containLabel: true },
  xAxis: { type: 'value', show: false, max: 100 },
  yAxis: { type: 'category', inverse: true, data: districts.value.map((d) => d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...commonText.value, color: theme.value === 'light' ? '#526568' : '#a9bcbd', width: 72, overflow: 'truncate' } },
  series: [{ type: 'bar', barWidth: 8, showBackground: true, backgroundStyle: { color: chartTheme.value.barBg, borderRadius: 2 }, data: districts.value.map((d) => ({ value: d.efficiency, itemStyle: { color: d.efficiency < 72 ? '#df665d' : d.efficiency < 80 ? '#e9b85d' : '#48cbaa', borderRadius: 2 }, label: { show: true, position: 'right', color: theme.value === 'light' ? '#344849' : '#cfe0df', formatter: '{c}%' } })) }],
}))

const flowOption = computed<EChartsCoreOption>(() => ({
  tooltip: tooltip.value,
  grid: { left: 8, right: 8, top: 12, bottom: 2, containLabel: true },
  xAxis: { type: 'category', data: ['滨江', '商务', '科创', '北站', '云港'], axisTick: { show: false }, axisLine: { lineStyle: { color: chartTheme.value.axis } }, axisLabel: commonText.value },
  yAxis: { type: 'value', axisLabel: { ...commonText.value, formatter: (value: number) => `${value / 1000}k` }, splitLine: { lineStyle: { color: chartTheme.value.split } } },
  series: [{ type: 'bar', barWidth: 12, data: [6340, 8460, 4720, 5890, 7250], itemStyle: { color: '#49c7aa', borderRadius: [2, 2, 0, 0] } }],
}))

const timer = window.setInterval(() => {
  now.value = new Date()
  tick.value += 1
}, 1000)
onBeforeUnmount(() => window.clearInterval(timer))

function selectDistrict(name: string) {
  selectedDistrict.value = name
}

function focusIncident() {
  mode.value = 'incident'
  selectedDistrict.value = '云港片区'
}

function changeMode(nextMode: TrafficMode) {
  mode.value = nextMode
  selectedDistrict.value = nextMode === 'incident' ? '云港片区' : '全市路网'
}

function resetView() {
  mode.value = 'overview'
  selectedDistrict.value = '全市路网'
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('lanjiang-theme', theme.value)
}
</script>

<template>
  <main class="dashboard-shell" :class="`${theme}-theme`">
    <header class="topbar">
      <div class="brand-mark"><Radio :size="20" /><span>LANJIANG TRAFFIC</span></div>
      <div class="title-wrap">
        <span class="title-rule" />
        <h1>智慧交通运行指挥中心</h1>
        <span class="title-rule" />
      </div>
      <div class="header-actions">
        <div class="system-status"><span class="status-dot" />系统运行正常</div>
        <button class="theme-toggle icon-button" :title="theme === 'dark' ? '切换亮色主题' : '切换暗色主题'" @click="toggleTheme">
          <Sun v-if="theme === 'dark'" :size="17" />
          <Moon v-else :size="17" />
        </button>
      </div>
      <div class="clock"><strong>{{ currentTime }}</strong><span>{{ currentDate }}</span></div>
    </header>

    <section class="kpi-strip" aria-label="核心交通指标">
      <article v-for="item in kpis" :key="item.label" class="kpi-item">
        <component :is="item.icon" :size="20" />
        <div><span>{{ item.label }}</span><strong>{{ item.value }} <small v-if="item.unit">{{ item.unit }}</small></strong></div>
        <em>{{ item.delta }}</em>
      </article>
    </section>

    <section class="dashboard-grid">
      <aside class="side-column left-column">
        <section class="panel flow-panel">
          <div class="panel-heading"><div><span>FLOW ANALYSIS</span><h2>区域实时车流</h2></div><CarFront :size="18" /></div>
          <EChart :option="flowOption" />
        </section>
        <section class="panel efficiency-panel">
          <div class="panel-heading"><div><span>EFFICIENCY</span><h2>路网通行效率</h2></div><ShieldCheck :size="18" /></div>
          <EChart :option="rankOption" />
        </section>
        <section class="panel signal-panel">
          <div class="panel-heading"><div><span>INTERSECTIONS</span><h2>路口设备状态</h2></div><Radio :size="18" /></div>
          <div class="signal-overview">
            <div class="signal-ring"><strong>98.7%</strong><span>在线率</span></div>
            <div class="signal-stats">
              <p><i class="ok" />正常运行 <b>1,286</b></p>
              <p><i class="warn" />配时优化 <b>16</b></p>
              <p><i class="danger" />设备离线 <b>7</b></p>
            </div>
          </div>
        </section>
      </aside>

      <section class="map-stage">
        <CityScene :mode="mode" :intensity="intensity" :theme="theme" @select="selectDistrict" />
        <div class="map-vignette" />
        <div class="map-caption">
          <span><LocateFixed :size="15" /> 当前视域</span>
          <strong>{{ selectedDistrict }}</strong>
          <small>实时路网态势 · {{ currentTime }}</small>
        </div>
        <div class="scene-metrics">
          <span><i class="ok" />畅通 72%</span>
          <span><i class="warn" />缓行 19%</span>
          <span><i class="danger" />拥堵 9%</span>
        </div>
        <button class="reset-button icon-button" title="恢复全局视图" @click="resetView"><RotateCcw :size="17" /></button>
        <div class="incident-callout" :class="{ active: mode === 'incident' }" @click="focusIncident">
          <AlertTriangle :size="16" /><div><strong>交通事故</strong><span>云港大道 · 处置中</span></div>
        </div>
      </section>

      <aside class="side-column right-column">
        <section class="panel trend-panel">
          <div class="panel-heading"><div><span>CONGESTION TREND</span><h2>24 小时拥堵趋势</h2></div><Activity :size="18" /></div>
          <EChart :option="trendOption" />
        </section>
        <section class="panel event-panel">
          <div class="panel-heading"><div><span>LIVE INCIDENTS</span><h2>实时交通事件</h2></div><span class="event-count">12</span></div>
          <div class="event-list">
            <button v-for="event in events" :key="event.id" @click="event.id === 1 && focusIncident()">
              <time>{{ event.time }}</time><i :class="event.level === '紧急' ? 'danger' : event.level === '警告' ? 'warn' : 'info'" />
              <div><strong>{{ event.title }}</strong><span>{{ event.location }}</span></div><em>{{ event.status }}</em>
            </button>
          </div>
        </section>
        <section class="panel dispatch-panel">
          <div class="panel-heading"><div><span>DISPATCH</span><h2>应急力量调度</h2></div><ShieldCheck :size="18" /></div>
          <div class="dispatch-grid">
            <div><strong>24</strong><span>交警单元</span><small>已出动 8</small></div>
            <div><strong>7</strong><span>清障车辆</span><small>已出动 3</small></div>
            <div><strong>18</strong><span>巡检人员</span><small>已到场 5</small></div>
          </div>
        </section>
      </aside>
    </section>

    <footer class="mode-dock">
      <span class="live-indicator"><i />LIVE</span>
      <div class="mode-tabs">
        <button v-for="item in modes" :key="item.value" :class="{ active: mode === item.value }" @click="changeMode(item.value)">
          <component :is="item.icon" :size="16" />{{ item.label }}
        </button>
      </div>
      <div class="data-source">数据刷新 <strong>1s</strong><span />仿真数据源</div>
    </footer>
  </main>
</template>
