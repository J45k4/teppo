type ModalOptions = {
	backdrop: HTMLDivElement | null
	focusTarget?: HTMLElement | null
	onOpen?: () => void
	onClose?: () => void
}

type ModalControls = {
	open: () => void
	close: () => void
}

export function createModal({
	backdrop,
	focusTarget,
	onOpen,
	onClose,
}: ModalOptions): ModalControls {
	if (!backdrop) {
		return {
			open: () => {},
			close: () => {},
		}
	}

	let isOpen = false

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault()
			close()
		}
	}

	const close = () => {
		if (!isOpen) return
		isOpen = false
		backdrop.classList.remove("is-visible")
		backdrop.setAttribute("aria-hidden", "true")
		document.removeEventListener("keydown", handleKeydown)
		onClose?.()
	}

	const open = () => {
		if (isOpen) return
		isOpen = true
		backdrop.classList.add("is-visible")
		backdrop.setAttribute("aria-hidden", "false")
		document.addEventListener("keydown", handleKeydown)
		onOpen?.()
		focusTarget?.focus()
	}

	backdrop.addEventListener("click", (event) => {
		if (event.target === backdrop) {
			close()
		}
	})

	return { open, close }
}
