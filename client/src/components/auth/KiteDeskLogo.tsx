type KiteDeskLogoProps = {
  large?: boolean;
};

function KiteDeskLogo({ large = false }: KiteDeskLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid place-items-center bg-gradient-to-br from-kite-blue to-kite-blue-deep shadow-md shadow-kite-blue/30 ${
          large
            ? "h-14 w-14 rounded-2xl"
            : "h-10 w-10 rounded-xl"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={large ? "h-8 w-8" : "h-6 w-6"}
          aria-hidden="true"
        >
          {/* Rotates the kite graphics around the center point (12, 12) */}
          <g transform="rotate(45 12 12)">
            <path
              d="M12 2.5 19.5 9 12 21.5 4.5 9Z"
              fill="white"
              fillOpacity="0.14"
            />

            <path d="M12 2.5V21.5M4.5 9H19.5" />

            <path
              d="M12 21.5c-1.8 1.3-3.8 1.4-5.4.4"
              strokeOpacity="0.85"
            />
          </g>
        </svg>
      </div>

      <span
        className={`font-semibold tracking-tight text-kite-ink ${
          large ? "text-2xl" : "text-xl"
        }`}
      >
        Kite
        <span className="text-kite-blue-deep">Desk</span>
      </span>
    </div>
  );
}

export default KiteDeskLogo;