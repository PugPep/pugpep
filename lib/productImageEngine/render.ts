import sharp, {
  type OverlayOptions,
} from "sharp";

import type {
  CyberPalette,
  EngineProduct,
  ProductImageTemplate,
} from "./types";

type RenderTemplate = ProductImageTemplate & {
  name_font_size?: number;
  strength_font_size?: number;
  research_font_size?: number;
};

function escapeXml(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitProductName(
  value: string
): {
  name: string;
  strength: string;
} {
  const trimmed =
    value.trim();

  const match =
    trimmed.match(
      /^(.*?)(?:\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml)))$/i
    );

  if (!match) {
    return {
      name:
        trimmed,

      strength:
        "",
    };
  }

  return {
    name:
      match[1].trim(),

    strength:
      match[2].trim(),
  };
}

function getManualLabelLines(
  value: string
): string[] {
  const lines =
    value
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(
        (line) =>
          line.trim()
      );

  return lines.length > 0
    ? lines
    : [value];
}

function getLongestLine(
  lines: string[]
): string {
  return lines.reduce(
    (longest, line) =>
      line.length >
      longest.length
        ? line
        : longest,
    ""
  );
}

function getAdaptiveNameFontSize(
  value: string,
  requestedSize: number
): number {
  const length =
    value.length;

  let maximum =
    requestedSize;

  if (length > 32) {
    maximum =
      Math.min(
        maximum,
        30
      );
  } else if (
    length > 27
  ) {
    maximum =
      Math.min(
        maximum,
        34
      );
  } else if (
    length > 22
  ) {
    maximum =
      Math.min(
        maximum,
        40
      );
  } else if (
    length > 18
  ) {
    maximum =
      Math.min(
        maximum,
        46
      );
  } else if (
    length > 14
  ) {
    maximum =
      Math.min(
        maximum,
        54
      );
  } else if (
    length > 10
  ) {
    maximum =
      Math.min(
        maximum,
        62
      );
  }

  return maximum;
}

function getProductNameLetterSpacing(
  value: string
): number {
  if (
    value.length <= 14
  ) {
    return 1.5;
  }

  if (
    value.length <= 22
  ) {
    return 1;
  }

  return 0;
}

async function fetchImageBuffer(
  url: string
): Promise<Buffer> {
  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Unable to load image (${response.status}): ${url}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  return Buffer.from(
    arrayBuffer
  );
}

function createGlowLayer(
  width: number,
  height: number,
  palette: CyberPalette
): Buffer {
  const svg = `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          id="vialGlow"
        >
          <stop
            offset="0%"
            stop-color="${palette.glow}"
            stop-opacity="0.55"
          />

          <stop
            offset="42%"
            stop-color="${palette.glow}"
            stop-opacity="0.28"
          />

          <stop
            offset="72%"
            stop-color="${palette.glow}"
            stop-opacity="0.09"
          />

          <stop
            offset="100%"
            stop-color="${palette.glow}"
            stop-opacity="0"
          />
        </radialGradient>

        <filter
          id="blurGlow"
        >
          <feGaussianBlur
            stdDeviation="38"
          />
        </filter>
      </defs>

      <ellipse
        cx="${width / 2}"
        cy="${height * 0.53}"
        rx="${width * 0.31}"
        ry="${height * 0.24}"
        fill="url(#vialGlow)"
        filter="url(#blurGlow)"
      />
    </svg>
  `;

  return Buffer.from(
    svg
  );
}

function createTextLayer(
  width: number,
  height: number,
  template: RenderTemplate,
  productName: string,
  strength: string,
  palette: CyberPalette
): Buffer {
  const productNameLines =
    getManualLabelLines(
      productName.toUpperCase()
    );

  const safeProductNameLines =
    productNameLines.map(
      (line) =>
        escapeXml(line)
    );

  const safeStrength =
    escapeXml(
      strength.toUpperCase()
    );

  const requestedNameSize =
    template.name_font_size ??
    54;

  const nameFontSize =
    getAdaptiveNameFontSize(
      getLongestLine(
        productNameLines
      ),
      requestedNameSize
    );

  const strengthFontSize =
    template.strength_font_size ??
    42;

  const researchFontSize =
    template.research_font_size ??
    22;

  const productNameLetterSpacing =
    getProductNameLetterSpacing(
      getLongestLine(
        productNameLines
      )
    );

  const nameLineHeight =
    Math.max(
      Math.round(
        nameFontSize * 0.98
      ),
      24
    );

  const nameStartY =
    template.name_y -
    ((safeProductNameLines.length - 1) *
      nameLineHeight) /
      2;

  const nameMarkup =
    safeProductNameLines
      .map(
        (line, index) => `
          <text
            x="${width / 2}"
            y="${nameStartY + index * nameLineHeight}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="${palette.primary}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${nameFontSize}"
            font-weight="900"
            letter-spacing="${productNameLetterSpacing}"
            filter="url(#nameGlow)"
          >
            ${line}
          </text>
        `
      )
      .join("");

  const strengthMarkup =
    strength
      ? `
        <text
          x="${width / 2}"
          y="${template.strength_y}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="${palette.primary}"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${strengthFontSize}"
          font-weight="900"
          letter-spacing="1.5"
          filter="url(#textGlow)"
        >
          ${safeStrength}
        </text>
      `
      : "";

  const svg = `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          id="textGlow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur
            stdDeviation="3"
            result="blur"
          />

          <feMerge>
            <feMergeNode
              in="blur"
            />

            <feMergeNode
              in="SourceGraphic"
            />
          </feMerge>
        </filter>

        <filter
          id="nameGlow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur
            stdDeviation="2"
            result="blur"
          />

          <feMerge>
            <feMergeNode
              in="blur"
            />

            <feMergeNode
              in="SourceGraphic"
            />
          </feMerge>
        </filter>
      </defs>

      ${nameMarkup}

      ${strengthMarkup}

      <text
        x="${width / 2}"
        y="${template.research_text_y}"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#f5f7fa"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${researchFontSize}"
        font-weight="800"
        letter-spacing="3"
        filter="url(#textGlow)"
      >
        FOR RESEARCH USE ONLY
      </text>
    </svg>
  `;

  return Buffer.from(
    svg
  );
}

async function createMaskedColorLayer(
  width: number,
  height: number,
  maskBuffer: Buffer,
  palette: CyberPalette
): Promise<Buffer> {
  const normalizedMask =
    await sharp(
      maskBuffer
    )
      .resize(
        width,
        height,
        {
          fit:
            "fill",
        }
      )
      .ensureAlpha()
      .png()
      .toBuffer();

  const rgb =
    hexToRgb(
      palette.primary
    );

  const solidColor =
    await sharp({
      create: {
        width,
        height,

        channels:
          4,

        background: {
          r:
            rgb.r,

          g:
            rgb.g,

          b:
            rgb.b,

          alpha:
            0.48,
        },
      },
    })
      .png()
      .toBuffer();

  return sharp(
    solidColor
  )
    .composite([
      {
        input:
          normalizedMask,

        blend:
          "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

function hexToRgb(
  hex: string
): {
  r: number;
  g: number;
  b: number;
} {
  const normalized =
    hex.replace(
      "#",
      ""
    );

  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map(
            (
              character
            ) =>
              `${character}${character}`
          )
          .join("")
      : normalized;

  const value =
    Number.parseInt(
      safeHex,
      16
    );

  return {
    r:
      (value >> 16) &
      255,

    g:
      (value >> 8) &
      255,

    b:
      value &
      255,
  };
}

export async function renderProductImage(
  args: {
    template:
      RenderTemplate;

    templateUrl:
      string;

    maskUrl?:
      string | null;

    product:
      EngineProduct;

    palette:
      CyberPalette;

    labelText?:
      string | null;
  }
): Promise<Buffer> {
  const {
    template,
    templateUrl,
    maskUrl,
    product,
    palette,
    labelText,
  } =
    args;

  const width =
    template.canvas_width ||
    1200;

  const height =
    template.canvas_height ||
    1500;

  const templateBuffer =
    await fetchImageBuffer(
      templateUrl
    );

  const {
    name:
      defaultProductName,

    strength,
  } =
    splitProductName(
      product.name
    );

  const productName =
    typeof labelText === "string" &&
    labelText.trim().length > 0
      ? labelText
      : defaultProductName;

  const glowLayer =
    createGlowLayer(
      width,
      height,
      palette
    );

  const textLayer =
    createTextLayer(
      width,
      height,
      template,
      productName,
      strength,
      palette
    );

  const composites:
    OverlayOptions[] = [
      {
        input:
          glowLayer,

        top:
          0,

        left:
          0,

        blend:
          "screen",
      },
    ];

  if (
    maskUrl
  ) {
    const maskBuffer =
      await fetchImageBuffer(
        maskUrl
      );

    const maskedColorLayer =
      await createMaskedColorLayer(
        width,
        height,
        maskBuffer,
        palette
      );

    composites.push({
      input:
        maskedColorLayer,

      top:
        0,

      left:
        0,

      blend:
        "screen",
    });
  }

  composites.push({
    input:
      textLayer,

    top:
      0,

    left:
      0,
  });

  return sharp(
    templateBuffer
  )
    .resize(
      width,
      height,
      {
        fit:
          "cover",

        position:
          "center",
      }
    )
    .composite(
      composites
    )
    .webp({
      quality:
        92,

      effort:
        4,
    })
    .toBuffer();
}