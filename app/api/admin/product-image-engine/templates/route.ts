import { NextResponse } from "next/server";

import {
  requireProductImageAdmin,
} from "../../../../../lib/productImageEngine/server";

const VALID_FAMILIES = [
  "peptides",
  "sprays",
  "lab-materials",
];

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

  return Math.round(
    parsed
  );
}

export async function GET(
  request: Request
) {
  try {
    const {
      admin,
    } =
      await requireProductImageAdmin(
        request
      );

    const url =
      new URL(
        request.url
      );

    const family =
      url.searchParams.get(
        "family"
      ) ||
      "peptides";

    if (
      !VALID_FAMILIES.includes(
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
      data,
      error,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .select("*")
        .eq(
          "family",
          family
        )
        .order(
          "version",
          {
            ascending: false,
          }
        );

    if (
      error
    ) {
      console.error(
        "Product Image Engine template lookup failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load templates.",
        },
        {
          status: 500,
        }
      );
    }

    const templates =
      (
        data || []
      ).map(
        (
          template
        ) => {
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

          return {
            ...template,

            template_url:
              templateUrl,

            mask_url:
              maskUrl,
          };
        }
      );

    return NextResponse.json({
      family,
      templates,
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
      "Product Image Engine templates GET failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load templates.",
      },
      {
        status: 500,
      }
    );
  }
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

    const form =
      await request.formData();

    const family =
      String(
        form.get(
          "family"
        ) || ""
      );

    const name =
      String(
        form.get(
          "name"
        ) ||
          "PugPep AI Master"
      );

    const templateFile =
      form.get(
        "template"
      );

    const maskFile =
      form.get(
        "mask"
      );

    if (
      !VALID_FAMILIES.includes(
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

    if (
      !(
        templateFile instanceof File
      )
    ) {
      return NextResponse.json(
        {
          error:
            "AI template image is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        latestTemplate,

      error:
        latestError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .select(
          "version"
        )
        .eq(
          "family",
          family
        )
        .order(
          "version",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      latestError
    ) {
      console.error(
        "Unable to determine latest template version:",
        latestError
      );

      return NextResponse.json(
        {
          error:
            "Unable to determine template version.",
        },
        {
          status: 500,
        }
      );
    }

    const version =
      (
        latestTemplate?.version ||
        0
      ) + 1;

    const folder =
      `${family}/v${version}-${Date.now()}`;

    const safeTemplateName =
      templateFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

    const templatePath =
      `${folder}/template-${safeTemplateName}`;

    const templateBytes =
      Buffer.from(
        await templateFile.arrayBuffer()
      );

    const {
      error:
        templateUploadError,
    } =
      await admin.storage
        .from(
          "product-image-templates"
        )
        .upload(
          templatePath,
          templateBytes,
          {
            contentType:
              templateFile.type ||
              "image/png",

            upsert:
              false,
          }
        );

    if (
      templateUploadError
    ) {
      console.error(
        "AI template upload failed:",
        templateUploadError
      );

      return NextResponse.json(
        {
          error:
            "Unable to upload AI template image.",
        },
        {
          status: 500,
        }
      );
    }

    let maskPath:
      | string
      | null =
      null;

    if (
      maskFile instanceof File &&
      maskFile.size > 0
    ) {
      const safeMaskName =
        maskFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );

      maskPath =
        `${folder}/mask-${safeMaskName}`;

      const maskBytes =
        Buffer.from(
          await maskFile.arrayBuffer()
        );

      const {
        error:
          maskUploadError,
      } =
        await admin.storage
          .from(
            "product-image-templates"
          )
          .upload(
            maskPath,
            maskBytes,
            {
              contentType:
                maskFile.type ||
                "image/png",

              upsert:
                false,
            }
          );

      if (
        maskUploadError
      ) {
        console.error(
          "Vial mask upload failed:",
          maskUploadError
        );

        return NextResponse.json(
          {
            error:
              "AI template uploaded, but vial mask upload failed.",
          },
          {
            status: 500,
          }
        );
      }
    }

    const {
      error:
        deactivateError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .update({
          is_active:
            false,
        })
        .eq(
          "family",
          family
        );

    if (
      deactivateError
    ) {
      console.error(
        "Unable to deactivate previous templates:",
        deactivateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to update active template.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data:
        insertedTemplate,

      error:
        insertError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .insert({
          family,

          name,

          version,

          is_active:
            true,

          template_path:
            templatePath,

          mask_path:
            maskPath,

          name_y:
            1110,

          strength_y:
            1170,

          research_text_y:
            1228,

          name_font_size:
            54,

          strength_font_size:
            42,

          research_font_size:
            22,

          created_by:
            user.id,
        })
        .select("*")
        .single();

    if (
      insertError ||
      !insertedTemplate
    ) {
      console.error(
        "Template database insert failed:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Template image uploaded, but template record could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    const templateUrl =
      admin.storage
        .from(
          "product-image-templates"
        )
        .getPublicUrl(
          insertedTemplate.template_path
        )
        .data.publicUrl;

    const maskUrl =
      insertedTemplate.mask_path
        ? admin.storage
            .from(
              "product-image-templates"
            )
            .getPublicUrl(
              insertedTemplate.mask_path
            )
            .data.publicUrl
        : null;

    return NextResponse.json({
      success:
        true,

      template: {
        ...insertedTemplate,

        template_url:
          templateUrl,

        mask_url:
          maskUrl,
      },
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
      "Product Image Engine templates POST failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save template.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
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

    const templateId =
      String(
        body.templateId ||
        ""
      );

    if (
      !templateId
    ) {
      return NextResponse.json(
        {
          error:
            "Template ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const nameY =
      safeNumber(
        body.nameY,
        1110
      );

    const strengthY =
      safeNumber(
        body.strengthY,
        1170
      );

    const researchTextY =
      safeNumber(
        body.researchTextY,
        1228
      );

    const nameFontSize =
      safeNumber(
        body.nameFontSize,
        54
      );

    const strengthFontSize =
      safeNumber(
        body.strengthFontSize,
        42
      );

    const researchFontSize =
      safeNumber(
        body.researchFontSize,
        22
      );

    if (
      nameY < 0 ||
      strengthY < 0 ||
      researchTextY < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Text positions cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      nameFontSize < 8 ||
      nameFontSize > 120 ||
      strengthFontSize < 8 ||
      strengthFontSize > 120 ||
      researchFontSize < 8 ||
      researchFontSize > 120
    ) {
      return NextResponse.json(
        {
          error:
            "Font sizes must be between 8 and 120.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        updatedTemplate,

      error:
        updateError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .update({
          name_y:
            nameY,

          strength_y:
            strengthY,

          research_text_y:
            researchTextY,

          name_font_size:
            nameFontSize,

          strength_font_size:
            strengthFontSize,

          research_font_size:
            researchFontSize,
        })
        .eq(
          "id",
          templateId
        )
        .select("*")
        .single();

    if (
      updateError ||
      !updatedTemplate
    ) {
      console.error(
        "Template layout update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save template layout.",
        },
        {
          status: 500,
        }
      );
    }

    const templateUrl =
      admin.storage
        .from(
          "product-image-templates"
        )
        .getPublicUrl(
          updatedTemplate.template_path
        )
        .data.publicUrl;

    const maskUrl =
      updatedTemplate.mask_path
        ? admin.storage
            .from(
              "product-image-templates"
            )
            .getPublicUrl(
              updatedTemplate.mask_path
            )
            .data.publicUrl
        : null;

    return NextResponse.json({
      success:
        true,

      template: {
        ...updatedTemplate,

        template_url:
          templateUrl,

        mask_url:
          maskUrl,
      },
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
      "Product Image Engine templates PATCH failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to save template layout.",
      },
      {
        status: 500,
      }
    );
  }
}