import { Component, Input, type OnInit, type AfterViewInit, type ElementRef, ViewChild } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-metrics-panel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./metrics-panel.component.html",
  styleUrls: ["./metrics-panel.component.scss"],
})
export class MetricsPanelComponent implements OnInit, AfterViewInit {
  @Input() title = ""
  @Input() chartData = ""
  @Input() chartLabels = ""

  @ViewChild("chartCanvas") chartCanvas!: ElementRef<HTMLCanvasElement>

  constructor() {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.renderChart()
  }

  renderChart(): void {
    const canvas = this.chartCanvas.nativeElement
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 300
    canvas.height = canvas.parentElement?.clientHeight || 200

    const data = this.chartData.split(",").map(Number)
    const labels = this.chartLabels.split(",")

    // Calculate chart dimensions
    const width = canvas.width
    const height = canvas.height
    const padding = 30
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Calculate scales
    const maxValue = Math.max(...data) * 1.1 // Add 10% padding
    const xStep = chartWidth / (data.length - 1)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw grid lines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)"
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // Add y-axis labels
      const value = Math.round((maxValue - (maxValue / 5) * i) * 10) / 10
      ctx.fillStyle = "#94a3b8"
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(value.toString(), padding - 5, y + 3)
    }

    // Draw x-axis labels (only show a subset to avoid crowding)
    const labelStep = Math.ceil(labels.length / 6)
    for (let i = 0; i < labels.length; i += labelStep) {
      const x = padding + xStep * i
      ctx.fillStyle = "#94a3b8"
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(labels[i], x, height - padding + 15)
    }

    // Draw line chart
    ctx.strokeStyle = "#2d5ded"
    ctx.lineWidth = 2
    ctx.beginPath()

    // Create gradient for area under the line
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding)
    gradient.addColorStop(0, "rgba(45, 93, 237, 0.2)")
    gradient.addColorStop(1, "rgba(45, 93, 237, 0)")

    // Draw data points and line
    data.forEach((value, index) => {
      const x = padding + xStep * index
      const y = padding + chartHeight - (value / maxValue) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    // Stroke the line
    ctx.stroke()

    // Fill area under the line
    ctx.lineTo(padding + xStep * (data.length - 1), height - padding)
    ctx.lineTo(padding, height - padding)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw data points
    data.forEach((value, index) => {
      const x = padding + xStep * index
      const y = padding + chartHeight - (value / maxValue) * chartHeight

      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = "#2d5ded"
      ctx.fill()
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }
}
