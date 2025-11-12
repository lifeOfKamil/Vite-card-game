import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactElement } from "react";

type PopupVariant = "info" | "success" | "warning" | "error";
type PopupProps = {
	message: string;
	onClose: () => void;
	variant?: PopupVariant;
	autoCloseMs?: number; // e.g. 2500
};

const variantStyles: Record<PopupVariant, { ring: string; text: string; icon: ReactElement }> = {
	info: {
		ring: "ring-sky-400/50",
		text: "text-sky-200",
		icon: <span className="text-sky-300">ℹ️</span>,
	},
	success: {
		ring: "ring-emerald-400/50",
		text: "text-emerald-200",
		icon: <span className="text-emerald-300">✅</span>,
	},
	warning: {
		ring: "ring-amber-400/50",
		text: "text-amber-200",
		icon: <span className="text-amber-300">⚠️</span>,
	},
	error: {
		ring: "ring-rose-400/50",
		text: "text-rose-200",
		icon: <span className="text-rose-300">⛔</span>,
	},
};

export default function Popup({ message, onClose, variant = "info", autoCloseMs = 2500 }: PopupProps) {
	const closeTimer = useRef<number | null>(null);

	// Close on Esc
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	// Auto close
	useEffect(() => {
		if (autoCloseMs > 0) {
			closeTimer.current = window.setTimeout(onClose, autoCloseMs);
		}
		return () => {
			if (closeTimer.current) window.clearTimeout(closeTimer.current);
		};
	}, [autoCloseMs, onClose]);

	const { ring, text, icon } = variantStyles[variant];

	// Portal so it floats above everything without affecting layout
	return createPortal(
		<div className="pointer-events-none fixed inset-x-0 top-6 z-1000 flex justify-center px-4 sm:px-0">
			<div
				role="dialog"
				aria-live="polite"
				aria-modal="false"
				className={[
					"pointer-events-auto relative",
					"rounded-2xl border border-white/10",
					"backdrop-blur-xl bg-white/5",
					"shadow-2xl ring-1",
					ring,
					"px-4 py-3 sm:px-5 sm:py-3.5",
					"animate-in slide-in-from-top-4 fade-in duration-200",
				].join(" ")}
			>
				{/* Glow accent */}
				<div className="absolute -inset-px rounded-2xl bg-linear-to-br from-white/10 via-white/0 to-white/0" />

				{/* Content */}
				<div className="relative flex items-center gap-3">
					<div className="text-xl leading-none">{icon}</div>
					<p className={`text-sm font-medium ${text}`}>{message}</p>
					<button
						type="button"
						onClick={onClose}
						className="ml-2 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-200/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
						aria-label="Close"
					>
						Close
					</button>
				</div>

				{/* Subtle floating motion */}
				<div className="pointer-events-none absolute -z-10 inset-0 rounded-2xl animate-float" />
			</div>
		</div>,
		document.body
	);
}
