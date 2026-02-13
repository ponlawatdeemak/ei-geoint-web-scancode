export function getPin(color?: string | null) {
  const fill = color?.trim() || 'rgb(232,232,232)'

  const svg = `<svg width="232" height="276" viewBox="0 0 58 69" fill="none" xmlns="http://www.w3.org/2000/svg">
	  <g filter="url(#filter0_d_1741_87444)">
	  <mask id="path-1-inside-1_1741_87444" fill="white">
	  <path fill-rule="evenodd" clip-rule="evenodd" d="M35.3546 57.291C46.0841 54.5306 54 44.9456 54 33.5455C54 19.9894 42.8071 9 29 9C15.1929 9 4 19.9894 4 33.5455C4 44.9446 11.9144 54.5288 22.6424 57.2902L28.9987 69.0002L35.3546 57.291Z"/>
	  </mask>
	  <path fill-rule="evenodd" clip-rule="evenodd" d="M35.3546 57.291C46.0841 54.5306 54 44.9456 54 33.5455C54 19.9894 42.8071 9 29 9C15.1929 9 4 19.9894 4 33.5455C4 44.9446 11.9144 54.5288 22.6424 57.2902L28.9987 69.0002L35.3546 57.291Z" fill="${fill}"/>
	  <path d="M35.3546 57.291L34.8563 55.354L34.0125 55.5711L33.5968 56.3368L35.3546 57.291ZM22.6424 57.2902L24.4001 56.3361L23.9846 55.5705L23.1409 55.3533L22.6424 57.2902ZM28.9987 69.0002L27.241 69.9543L28.9987 73.1926L30.7564 69.9543L28.9987 69.0002ZM52 33.5455C52 43.9883 44.746 52.8097 34.8563 55.354L35.8529 59.2279C47.4223 56.2515 56 45.903 56 33.5455H52ZM29 11C41.7373 11 52 21.1284 52 33.5455H56C56 18.8504 43.8769 7 29 7V11ZM6 33.5455C6 21.1284 16.2627 11 29 11V7C14.1231 7 2 18.8504 2 33.5455H6ZM23.1409 55.3533C13.2526 52.8081 6 43.9873 6 33.5455H2C2 45.9018 10.5761 56.2495 22.1439 59.227L23.1409 55.3533ZM30.7564 68.0461L24.4001 56.3361L20.8847 58.2443L27.241 69.9543L30.7564 68.0461ZM33.5968 56.3368L27.241 68.0461L30.7564 69.9543L37.1123 58.2451L33.5968 56.3368Z" fill="white" mask="url(#path-1-inside-1_1741_87444)"/>
	  </g>
	  <g filter="url(#filter1_d_1741_87444)">
	  <ellipse cx="28.9983" cy="32.1818" rx="13.8889" ry="13.6364" fill="white"/>
	  <path d="M42.3872 32.1818C42.3872 39.4282 36.4014 45.3181 28.9983 45.3181C21.5951 45.3181 15.6094 39.4282 15.6094 32.1818C15.6094 24.9354 21.5951 19.0454 28.9983 19.0454C36.4014 19.0454 42.3872 24.9354 42.3872 32.1818Z" stroke="${fill}"/>
	  </g>
	  <defs>
	  <filter id="filter0_d_1741_87444" x="0" y="0" width="58" height="69" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
	  <feFlood flood-opacity="0" result="BackgroundImageFix"/>
	  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
	  <feOffset dy="-5"/>
	  <feGaussianBlur stdDeviation="2"/>
	  <feComposite in2="hardAlpha" operator="out"/>
	  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
	  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1741_87444"/>
	  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1741_87444" result="shape"/>
	  </filter>
	  <filter id="filter1_d_1741_87444" x="11.1094" y="18.5454" width="35.7773" height="35.2729" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
	  <feFlood flood-opacity="0" result="BackgroundImageFix"/>
	  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
	  <feOffset dy="4"/>
	  <feGaussianBlur stdDeviation="2"/>
	  <feComposite in2="hardAlpha" operator="out"/>
	  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
	  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1741_87444"/>
	  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1741_87444" result="shape"/>
	  </filter>
	  </defs>
	</svg>
	`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
