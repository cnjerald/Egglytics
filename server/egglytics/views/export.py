#
#
#
#
# FUNCTIONS INVOLVING EXPORTING
#
#
#
#

from ._imports import *

def export(request):
    models = (
        ImageDetails.objects
        .values_list("model_used", flat=True)
        .distinct()
    )

    return render(
        request,
        "base.html",
        {
            "included_template": "export.html",
            "models": models,
        }
    )