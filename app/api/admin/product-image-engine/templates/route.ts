import { NextResponse } from "next/server";

import {
  requireProductImageAdmin,
} from "../../../../../lib/productImageEngine/server";

const VALID_FAMILIES = [
  "peptides",
  "sprays",
  "lab-materials",
];

const VALID_PRODUCT_FAMILIES = [
  "metabolism-research",
  "brain-nerve-research",
  "cell-energy-research",
  "peptide-molecular-research",
  "hormone-signaling-research",
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

    const productFamily =
      url.searchParams.get(
        "product_family"
      ) || "";

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
      productFamily &&
      !VALID_PRODUCT_FAMILIES.includes(
        productFamily
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid research product family.",
        },
        {
          status: 400,
        }
      );
    }

    let templateQuery =
      admin
        .from(
          "product_image_templates"
        )
        .select("*")
        .eq(
          "family",
          family
        );

    if (
      productFamily
    ) {
      templateQuery =
        templateQuery.eq(
          "product_family",
          productFamily
        );
    }

    const {
      data,
      error,
    } =
      await templateQuery
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
      product_family:
        productFamily || null,
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

    const productFamily =
      String(
        form.get(
          "product_family"
        ) || ""
      ).trim();

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
      family !==
        "lab-materials" &&
      !VALID_PRODUCT_FAMILIES.includes(
        productFamily
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a valid research Product Family for this template.",
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

    /*
      IMPORTANT:
      Version numbers remain global within the existing
      image type bucket (peptides / sprays / lab-materials).

      The database may already enforce uniqueness on
      (family, version), so DO NOT restart version numbering
      for each research Product Family.
    */
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
      `${family}/${productFamily || "general"}/v${version}-${Date.now()}`;

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

    let deactivateQuery =
      admin
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

    deactivateQuery =
      family === "lab-materials"
        ? deactivateQuery.is(
            "product_family",
            null
          )
        : deactivateQuery.eq(
            "product_family",
            productFamily
          );

    const {
      error:
        deactivateError,
    } =
      await deactivateQuery;

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

          product_family:
            family === "lab-materials"
              ? null
              : productFamily,

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
          database: {
            message:
              insertError?.message ||
              null,
            code:
              insertError?.code ||
              null,
            details:
              insertError?.details ||
              null,
            hint:
              insertError?.hint ||
              null,
          },
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

    const requestedName =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const hasProductFamilyUpdate =
      Object.prototype.hasOwnProperty.call(
        body,
        "product_family"
      );

    const requestedProductFamily =
      body.product_family === null ||
      body.product_family === ""
        ? null
        : typeof body.product_family === "string"
          ? body.product_family.trim()
          : null;

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

    if (
      hasProductFamilyUpdate &&
      requestedProductFamily !== null &&
      !VALID_PRODUCT_FAMILIES.includes(
        requestedProductFamily
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid research Product Family.",
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

    if (
      hasProductFamilyUpdate
    ) {
      const {
        data:
          currentTemplate,

        error:
          currentTemplateError,
      } =
        await admin
          .from(
            "product_image_templates"
          )
          .select(
            "id,family,is_active,product_family"
          )
          .eq(
            "id",
            templateId
          )
          .single();

      if (
        currentTemplateError ||
        !currentTemplate
      ) {
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
        currentTemplate.family ===
          "lab-materials"
      ) {
        return NextResponse.json(
          {
            error:
              "Lab Material templates do not use a research Product Family.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        currentTemplate.is_active
      ) {
        let targetActiveQuery =
          admin
            .from(
              "product_image_templates"
            )
            .update({
              is_active:
                false,
            })
            .eq(
              "family",
              currentTemplate.family
            )
            .eq(
              "is_active",
              true
            )
            .neq(
              "id",
              templateId
            );

        targetActiveQuery =
          requestedProductFamily === null
            ? targetActiveQuery.is(
                "product_family",
                null
              )
            : targetActiveQuery.eq(
                "product_family",
                requestedProductFamily
              );

        const {
          error:
            deactivateTargetError,
        } =
          await targetActiveQuery;

        if (
          deactivateTargetError
        ) {
          console.error(
            "Unable to deactivate target-family template:",
            deactivateTargetError
          );

          return NextResponse.json(
            {
              error:
                "Unable to move template into the selected Product Family.",
            },
            {
              status: 500,
            }
          );
        }
      }
    }

    const updatePayload: {
      name_y: number;
      strength_y: number;
      research_text_y: number;
      name_font_size: number;
      strength_font_size: number;
      research_font_size: number;
      name?: string;
      product_family?: string | null;
    } = {
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
    };

    if (requestedName) {
      updatePayload.name =
        requestedName;
    }

    if (
      hasProductFamilyUpdate
    ) {
      updatePayload.product_family =
        requestedProductFamily;
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
        .update(
          updatePayload
        )
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

export async function DELETE(
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

    const {
      data:
        template,

      error:
        lookupError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .select(
          `
          id,
          name,
          family,
          product_family,
          template_path,
          mask_path
          `
        )
        .eq(
          "id",
          templateId
        )
        .single();

    if (
      lookupError ||
      !template
    ) {
      console.error(
        "Template delete lookup failed:",
        lookupError
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

    /*
      Keep Product Image History intact.

      The history table has a foreign key back to
      product_image_templates, so a hard delete fails while
      history rows still reference this template.

      Clear those references first instead of deleting the
      history itself.
    */
    const {
      error:
        historyDetachError,
    } =
      await admin
        .from(
          "product_image_history"
        )
        .update({
          template_id:
            null,
        })
        .eq(
          "template_id",
          templateId
        );

    if (
      historyDetachError
    ) {
      console.error(
        "Template history detach failed:",
        historyDetachError
      );

      return NextResponse.json(
        {
          error:
            "Unable to delete this template because generated-image history still references it.",
          database: {
            message:
              historyDetachError.message ||
              null,
            code:
              historyDetachError.code ||
              null,
            details:
              historyDetachError.details ||
              null,
            hint:
              historyDetachError.hint ||
              null,
          },
        },
        {
          status: 500,
        }
      );
    }

    const {
      error:
        deleteError,
    } =
      await admin
        .from(
          "product_image_templates"
        )
        .delete()
        .eq(
          "id",
          templateId
        );

    if (
      deleteError
    ) {
      console.error(
        "Template database delete failed:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Template could not be deleted from the database.",
          database: {
            message:
              deleteError.message ||
              null,
            code:
              deleteError.code ||
              null,
            details:
              deleteError.details ||
              null,
            hint:
              deleteError.hint ||
              null,
          },
        },
        {
          status: 500,
        }
      );
    }

    /*
      Delete storage files only after the database row is gone.
      This prevents the previous failure mode where the files
      disappeared but the template record remained.
    */
    const storagePaths =
      [
        template.template_path,
        template.mask_path,
      ].filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          value.length > 0
      );

    let storageWarning:
      string | null =
      null;

    if (
      storagePaths.length > 0
    ) {
      const {
        error:
          storageDeleteError,
      } =
        await admin.storage
          .from(
            "product-image-templates"
          )
          .remove(
            storagePaths
          );

      if (
        storageDeleteError
      ) {
        console.error(
          "Template storage cleanup failed:",
          storageDeleteError
        );

        storageWarning =
          "Template record was deleted, but one or more stored template files could not be removed.";
      }
    }

    return NextResponse.json({
      success:
        true,
      deletedTemplateId:
        templateId,
      deletedTemplateName:
        template.name,
      warning:
        storageWarning,
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
      "Product Image Engine template DELETE failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete template.",
      },
      {
        status: 500,
      }
    );
  }
}

