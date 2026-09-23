import { NextResponse } from "next/server";

import {
  CYBER_PALETTES,
  paletteForSlug,
} from "../../../../../lib/productImageEngine/palettes";

import {
  renderProductImage,
} from "../../../../../lib/productImageEngine/render";

import {
  categoryFiltersForFamily,
  requireProductImageAdmin,
} from "../../../../../lib/productImageEngine/server";

import type {
  CyberPalette,
} from "../../../../../lib/productImageEngine/types";

export const maxDuration = 60;
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

    if (!normalized) {
      throw new Error(
        "Custom color must be a 6-digit hex color such as #ff45d8."
      );
    }

    return {
      key:
        `custom:${normalized}`,
      primary:
        normalized,
      secondary:
        normalized,
      glow:
        normalized,
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
    !Number.isFinite(parsed)
  ) {
    return fallback;
  }

  return Math.round(parsed);
}

export async function POST(
  request: Request
) {
  try {
    const {
      admin,
      user,
    } =
      await requireProductImageAdmin(
        request
      );

    const body =
      await request.json();

    /*
      HARD SAFETY BARRIER

      This route is allowed to modify live
      product images ONLY when the caller
      explicitly sends commit: true.
    */

    const commit =
      body.commit === true;

    if (!commit) {
      return NextResponse.json(
        {
          error:
            "Live image generation requires explicit commit confirmation.",
        },
        {
          status: 400,
        }
      );
    }

    const templateId =
      String(
        body.templateId ||
        ""
      );

    const family =
      String(
        body.family ||
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

    const productIds:
      string[] =
      Array.isArray(
        body.productIds
      )
        ? body.productIds
        : [];

    if (
      !templateId ||
      !family
    ) {
      return NextResponse.json(
        {
          error:
            "Template and product family are required.",
        },
        {
          status: 400,
        }
      );
    }

    const validFamilies = [
      "peptides",
      "sprays",
      "lab-materials",
    ];

    if (
      !validFamilies.includes(
        family
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product family.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: template,
      error: templateError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .select("*")
        .eq(
          "id",
          templateId
        )
        .single();

    if (
      templateError ||
      !template
    ) {
      console.error(
        "Image generation template lookup failed:",
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

    if (
      template.family !==
      family
    ) {
      return NextResponse.json(
        {
          error:
            "Selected template does not match the selected product family.",
        },
        {
          status: 400,
        }
      );
    }

    const templateProductFamily =
      template.product_family ||
      null;

    const categories =
      categoryFiltersForFamily(
        family
      );

    let productQuery =
      admin
        .from("products")
        .select(
          `
          id,
          name,
          slug,
          image,
          category,
          product_family,
          color
          `
        )
        .in(
          "category",
          categories
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

    if (
      productIds.length > 0
    ) {
      productQuery =
        productQuery.in(
          "id",
          productIds
        );
    }

    const {
      data: products,
      error: productsError,
    } =
      await productQuery;

    if (
      productsError
    ) {
      console.error(
        "Image generation product lookup failed:",
        productsError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load products.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !products ||
      products.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No products found for this request.",
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

    const results:
      Array<{
        id: string;
        slug: string;
        image: string;
        palette: string;
      }> = [];

    for (
      const product
      of products
    ) {
      const productFamily =
        product.product_family ||
        null;

      const isLabMaterial =
        product.category ===
        "lab-material";

      if (
        !isLabMaterial &&
        (
          !productFamily ||
          (
            templateProductFamily &&
            productFamily !==
              templateProductFamily
          )
        )
      ) {
        throw new Error(
          `Template Product Family mismatch for ${product.name}. Shared templates with no Product Family are allowed.`
        );
      }

      const palette =
        getRequestedPalette(
          paletteKey,
          product.slug,
          customColor
        );

      const generatedImage =
        await renderProductImage({
          template:
            renderTemplate,

          templateUrl,

          maskUrl,

          product,

          palette,

          labelText,
        });

      /*
        Generate a unique filename.

        This prevents a new image from silently
        overwriting an older generated file.
      */

      const generatedPath =
        `${family}/${product.product_family || "general"}/${product.slug}/template-v${template.version}-${Date.now()}.webp`;

      const {
        error: uploadError,
      } =
        await admin.storage
          .from(
            "product-generated-images"
          )
          .upload(
            generatedPath,
            generatedImage,
            {
              contentType:
                "image/webp",

              cacheControl:
                "3600",

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        console.error(
          `Generated image upload failed for ${product.slug}:`,
          uploadError
        );

        throw new Error(
          `Unable to upload generated image for ${product.name}.`
        );
      }

      const generatedUrl =
        admin.storage
          .from(
            "product-generated-images"
          )
          .getPublicUrl(
            generatedPath
          )
          .data.publicUrl;

      /*
        Save history BEFORE changing
        the live product record.
      */

      const {
        error: historyError,
      } =
        await admin
          .from(
            "product_image_history"
          )
          .insert({
            product_id:
              product.id,

            product_slug:
              product.slug,

            family,

            template_id:
              template.id,

            previous_image_url:
              product.image,

            generated_image_url:
              generatedUrl,

            palette_key:
              palette.key,

            created_by:
              user.id,
          });

      if (
        historyError
      ) {
        console.error(
          `Image history insert failed for ${product.slug}:`,
          historyError
        );

        throw new Error(
          `Unable to save image history for ${product.name}.`
        );
      }

      /*
        THIS IS THE ONLY PLACE IN THE
        IMAGE ENGINE THAT UPDATES THE
        LIVE PRODUCT IMAGE.
      */

      const {
        error: updateError,
      } =
        await admin
          .from("products")
          .update({
            image:
              generatedUrl,
          })
          .eq(
            "id",
            product.id
          );

      if (
        updateError
      ) {
        console.error(
          `Product image update failed for ${product.slug}:`,
          updateError
        );

        throw new Error(
          `Unable to update image for ${product.name}.`
        );
      }

      results.push({
        id:
          product.id,

        slug:
          product.slug,

        image:
          generatedUrl,

        palette:
          palette.key,
      });
    }

    return NextResponse.json({
      success:
        true,

      committed:
        true,

      family,

      templateId,

      paletteKey,

      count:
        results.length,

      results,
    });
  } catch (
    error
  ) {
    if (
      error instanceof Response
    ) {
      return error;
    }

    console.error(
      "Product Image Engine generation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate product images.",
      },
      {
        status: 500,
      }
    );
  }
}