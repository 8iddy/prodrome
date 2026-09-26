# Canonical observation model

`analytics.core.CANONICAL_FIELDS` is the authoritative aggregate observation contract. It contains source/dataset/location identity, observation date and ISO week, pathogen, optional laboratory indicators, optional coordinates, source record ID, ingestion time, and `data_quality_flags`.

All measurements are nullable. Missing data remains `null`; zero is retained only when explicitly measured. Adapters currently implemented are `WHOFluNetAdapter`, `ScotlandCARIAdapter`, `ScotlandHealthBoardCasesAdapter`, and `SyntheticLabAdapter`. Future CSV, JSON, REST, and DHIS2 aggregate inputs should implement the same transformation boundary. DHIS2 production integration is not implemented.
