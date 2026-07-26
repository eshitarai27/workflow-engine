"""A restricted expression evaluator for condition strings authored inside
workflow definitions.

Workflow conditions come from user-supplied JSON, so they cannot be handed to
Python's ``eval``/``exec`` even with a restricted globals dict -- that remains
exploitable. Instead, expressions are parsed with :mod:`ast` and walked by
hand, allow-listing only the node types a condition legitimately needs:
comparisons, boolean logic, arithmetic, literals, and variable lookups
against the execution context. Anything else (calls, attribute access,
imports, comprehensions, ...) raises :class:`UnsafeExpressionError`.
"""
from __future__ import annotations

import ast
import operator
from typing import Any, Mapping

_COMPARISONS = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.In: lambda a, b: a in b,
    ast.NotIn: lambda a, b: a not in b,
}

_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
}

_UNARY_OPS = {
    ast.Not: operator.not_,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


class UnsafeExpressionError(ValueError):
    """Raised when a condition expression contains a disallowed construct."""


def evaluate_condition(expression: str, variables: Mapping[str, Any]) -> bool:
    """Evaluate a boolean condition expression against ``variables``.

    Supports dotted/bracket lookups into the execution context, e.g.
    ``"quality_score >= threshold"`` or ``"status['code'] == 200"``.
    """
    if not expression or not expression.strip():
        return True
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise UnsafeExpressionError(f"Could not parse condition: {expression!r}") from exc
    return bool(_eval_node(tree.body, variables))


def _eval_node(node: ast.AST, variables: Mapping[str, Any]) -> Any:
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id not in variables:
            raise UnsafeExpressionError(f"Unknown variable: {node.id!r}")
        return variables[node.id]
    if isinstance(node, ast.Subscript):
        value = _eval_node(node.value, variables)
        key = _eval_node(node.slice, variables)
        try:
            return value[key]
        except (KeyError, IndexError, TypeError):
            return None
    if isinstance(node, ast.Attribute):
        raise UnsafeExpressionError("Attribute access is not permitted in conditions")
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, variables)
        result = True
        for op, comparator in zip(node.ops, node.comparators):
            op_type = type(op)
            if op_type not in _COMPARISONS:
                raise UnsafeExpressionError(f"Unsupported comparison: {op_type.__name__}")
            right = _eval_node(comparator, variables)
            result = result and _COMPARISONS[op_type](left, right)
            left = right
        return result
    if isinstance(node, ast.BoolOp):
        values = [_eval_node(v, variables) for v in node.values]
        return all(values) if isinstance(node.op, ast.And) else any(values)
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _BIN_OPS:
            raise UnsafeExpressionError(f"Unsupported operator: {op_type.__name__}")
        return _BIN_OPS[op_type](_eval_node(node.left, variables), _eval_node(node.right, variables))
    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _UNARY_OPS:
            raise UnsafeExpressionError(f"Unsupported unary operator: {op_type.__name__}")
        return _UNARY_OPS[op_type](_eval_node(node.operand, variables))
    if isinstance(node, ast.List):
        return [_eval_node(e, variables) for e in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(_eval_node(e, variables) for e in node.elts)
    raise UnsafeExpressionError(f"Disallowed expression element: {type(node).__name__}")
