type TimerTickHandler = (runningIds: Set<number>) => void

type TimerManagerOptions = {
	onTick: TimerTickHandler
	intervalMs?: number
}

export class TimerManager {
	private runningIds = new Set<number>()
	private intervalId: number | null = null
	private readonly onTick: TimerTickHandler
	private readonly intervalMs: number

	constructor(options: TimerManagerOptions) {
		this.onTick = options.onTick
		this.intervalMs = options.intervalMs ?? 1000
	}

	getRunningIds() {
		return this.runningIds
	}

	isRunning(id: number) {
		return this.runningIds.has(id)
	}

	start(id: number) {
		this.runningIds.add(id)
		this.ensureInterval()
	}

	stop(id: number) {
		this.runningIds.delete(id)
		if (this.runningIds.size === 0) {
			this.clearInterval()
		}
	}

	stopAll() {
		this.runningIds.clear()
		this.clearInterval()
	}

	private ensureInterval() {
		if (this.intervalId !== null) return
		this.intervalId = window.setInterval(() => {
			if (this.runningIds.size === 0) return
			this.onTick(this.runningIds)
		}, this.intervalMs)
	}

	private clearInterval() {
		if (this.intervalId === null) return
		clearInterval(this.intervalId)
		this.intervalId = null
	}
}
