"use client"

import Lottie from "lottie-react"
import walkingAnimation from "../../../public/Banda Trekker ET Animation.json"

export function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 select-none">

      {/* Lottie */}
      <div className="w-56 h-56">
        <Lottie
          animationData={walkingAnimation}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <h2 className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">
          No conversation selected
        </h2>
        <p className="text-[13px] text-slate-400 dark:text-slate-600 leading-relaxed max-w-[220px]">
          Pick someone from the left to start chatting
        </p>
      </div>
    </div>
  )
}
