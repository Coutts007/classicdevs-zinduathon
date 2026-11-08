"""Helpers so every endpoint documents its error responses the same way."""

from drf_spectacular.utils import OpenApiExample, OpenApiResponse

from .serializers import ErrorSerializer

_STATUS_TEXT = {
    400: "Bad request",
    401: "Not signed in or token invalid",
    403: "Not allowed",
    404: "Not found",
    409: "Conflict",
    429: "Too many requests",
    503: "Dependency unavailable",
}


def errors(*pairs: tuple[int, str]) -> dict[int, OpenApiResponse]:
    """errors((400, "validation_error"), (401, "token_invalid")) → schema `responses` entries.

    Several codes may share a status; they are listed in the description and as examples.
    """
    by_status: dict[int, list[str]] = {}
    for status_code, code in pairs:
        by_status.setdefault(status_code, []).append(code)
    return {
        status_code: OpenApiResponse(
            response=ErrorSerializer,
            description=f"{_STATUS_TEXT.get(status_code, 'Error')}: "
            + ", ".join(f"`{c}`" for c in codes),
            examples=[
                OpenApiExample(code, value={"code": code, "message": "…"}, response_only=True)
                for code in codes
            ],
        )
        for status_code, codes in by_status.items()
    }


_PAGINATED: dict[type, type] = {}


def paginated(serializer_class: type) -> type:
    """Schema for a page of results ({count, next, previous, results}), as StandardPagination
    returns it. Views that paginate by hand (APIView) must document their 200 with this, or
    generated clients would expect a bare array."""
    from rest_framework import serializers

    if serializer_class not in _PAGINATED:
        base = serializer_class.__name__.removesuffix("Serializer")
        _PAGINATED[serializer_class] = type(
            f"Paginated{base}ListSerializer",
            (serializers.Serializer,),
            {
                "count": serializers.IntegerField(),
                "next": serializers.URLField(allow_null=True),
                "previous": serializers.URLField(allow_null=True),
                "results": serializer_class(many=True),
            },
        )
    return _PAGINATED[serializer_class]


def restore_path_param_names(result, generator, request, public):
    """Post-processing hook (runs after camelize): the camelize hook renames path parameters
    (`public_id` → `publicId`) but not the `{public_id}` placeholders in the paths, which makes the
    spec invalid and breaks generated clients. Path parameters keep the template's names."""
    import re

    for path, item in result.get("paths", {}).items():
        names = re.findall(r"{([^}]+)}", path)
        lookup = {n.replace("_", "").lower(): n for n in names}
        for operation in item.values():
            if not isinstance(operation, dict):
                continue
            for param in operation.get("parameters", []):
                if param.get("in") == "path":
                    param["name"] = lookup.get(
                        param["name"].replace("_", "").lower(), param["name"]
                    )
    return result
