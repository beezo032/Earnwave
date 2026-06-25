import React from "react";

export function BrandLogo({ compact = false }) {
  return <img className={compact ? "brand-logo compact" : "brand-logo"} src="/earnwave-logo-polished.png" alt="EarnWave" />;
}
