# Superseded nullable rule schema

Native known-bound conflict analysis passed, but the unknown-rule response failed strict structural validation. Actual leader traces in failure-diagnostics.json identify RULE_SCHEMA before acceptance. The uncertain record remained SEALED. This historical address and all observed pending/failed/successful receipts are retained separately from canonical acceptance. The current parser accepts omitted null fields only under explicit UNKNOWN and optional missing unbounded sides of a structurally valid KNOWN interval.
