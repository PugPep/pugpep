import { NextResponse } from "next/server";

import {
  CYBER_PALETTES,
  paletteForSlug,
} from "../../../../../lib/productImageEngine/palettes";

import {
  renderProductImage,
} from "../../../../../lib/productImageEngine/render";

import {
  requireProductImageAdmin,
} from "../../../../../lib/productImageEngine/server";

import type {
  CyberPalette,
} from "../../../../../lib/productImageEngine/types";

export const dynamic = "force-dynamic";

function normalizeHexColor(
  value: unknown
): string | null {
  const raw =
    String(value || "")
      .trim();

  if (
    !/^#[0-9a-fA-F]{6}$/.test(
      raw
    )
  ) {
    return null;
  }

  return raw.toLowerCase();
}

function getRequestedPalette(
  paletteKey: string,
  slug: string,
  customColor: unknown
): CyberPalette {
  if (
    paletteKey === "custom"
  ) {
    const normalized =
      normalizeHexColor(
        customColor
      );

    const resolved =
      normalized ||
      "#ff45d8";

    return {
      key:
        `custom:${resolved}`,
      primary:
        resolved,
      secondary:
        resolved,
      glow:
        resolved,
    };
  }

  if (
    !paletteKey ||
    paletteKey === "random"
  ) {
    return paletteForSlug(
      slug
    );
  }

  const selected =
    CYBER_PALETTES.find(
      (palette) =>
        palette.key ===
        paletteKey
    );

  return (
    selected ||
    paletteForSlug(
      slug
    )
  );
}

function safeNumber(
  value: unknown,
  fallback: number
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.round(
    parsed
  );
}

export async function POST(
  request: Request
) {
  try {
    const {
      admin,
    } =
      await requireProductImageAdmin(
        request
      );

    const body =
      await request.json();

    const productId =
      String(
        body.productId ||
        ""
      );

    const templateId =
      String(
        body.templateId ||
        ""
      );

    const paletteKey =
      String(
        body.paletteKey ||
        "random"
      );

    const customColor =
      body.customColor;

    const labelText =
      typeof body.labelText === "string"
        ? body.labelText
        : null;

    const layout =
      body.layout || {};

    if (
      !productId ||
      !templateId
    ) {
      return NextResponse.json(
        {
          error:
            "Product and template are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      IMPORTANT:
      THIS ROUTE IS PREVIEW ONLY.

      It intentionally does NOT:
      - upload to Storage
      - insert image history
      - update products.image
    */

    const [
      productResult,
      templateResult,
    ] =
      await Promise.all([
        admin
          .from(
            "products"
          )
          .select(
            `
            id,
            name,
            slug,
            image,
            category,
            color
            `
          )
          .eq(
            "id",
            productId
          )
          .single(),

        admin
          .from(
            "product_image_templates"
          )
          .select("*")
          .eq(
            "id",
            templateId
          )
          .single(),
      ]);

    const {
      data: product,
      error: productError,
    } =
      productResult;

    const {
      data: template,
      error: templateError,
    } =
      templateResult;

    if (
      productError ||
      !product
    ) {
      console.error(
        "Preview product lookup failed:",
        productError
      );

      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      templateError ||
      !template
    ) {
      console.error(
        "Preview template lookup failed:",
        templateError
      );

      return NextResponse.json(
        {
          error:
            "Template not found.",
        },
        {
          status: 404,
        }
      );
    }

    const templateUrl =
      admin.storage
        .from(
          "product-image-templates"
        )
        .getPublicUrl(
          template.template_path
        )
        .data.publicUrl;

    const maskUrl =
      template.mask_path
        ? admin.storage
            .from(
              "product-image-templates"
            )
            .getPublicUrl(
              template.mask_path
            )
            .data.publicUrl
        : null;

    const palette =
      getRequestedPalette(
        paletteKey,
        product.slug,
        customColor
      );

    const renderTemplate = {
      ...template,

      name_y:
        safeNumber(
          layout.nameY,
          template.name_y ??
            1110
        ),

      strength_y:
        safeNumber(
          layout.strengthY,
          template.strength_y ??
            1170
        ),

      research_text_y:
        safeNumber(
          layout.researchTextY,
          template.research_text_y ??
            1205
        ),

      name_font_size:
        safeNumber(
          layout.nameFontSize,
          template.name_font_size ??
            54
        ),

      strength_font_size:
        safeNumber(
          layout.strengthFontSize,
          template.strength_font_size ??
            42
        ),

      research_font_size:
        safeNumber(
          layout.researchFontSize,
          template.research_font_size ??
            22
        ),
    };

    const image =
      await renderProductImage({
        template:
          renderTemplate,

        templateUrl,

        maskUrl,

        product,

        palette,

        labelText,
      });

    return new Response(
      new Uint8Array(
        image
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "image/webp",

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",

          "X-Product-Image-Mode":
            "preview-only",

          "X-Palette-Key":
            palette.key,

          "X-Palette-Primary":
            palette.primary,

          "X-Palette-Secondary":
            palette.secondary,
        },
      }
    );
  } catch (
    error
  ) {
    if (
      error instanceof Response
    ) {
      return error;
    }

    console.error(
      "Product Image Engine preview failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate preview.",
      },
      {
        status: 500,
      }
    );
  }
}
