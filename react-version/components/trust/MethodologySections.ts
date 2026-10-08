/**
 * The /methodology chapters, in page order. Each lives in
 * components/trust/methodology/; this barrel keeps the import path the
 * route has always used. All are Server Components except the two
 * interactive figures they embed (WeightExplorer, FirmnessFitChart).
 */
export { CHAPTERS, MethodologyHero, type ChapterDef } from './methodology/MethodologyHero';
export { MeaningSection, InputsSection } from './methodology/IntroSections';
export { DimensionsSection, WeightsSection, SubScoresSection } from './methodology/ModelSections';
export { CalculationSection, TiersSection } from './methodology/CalculationSections';
export { FlagsSection } from './methodology/FlagsSection';
export { ProvenanceSection } from './methodology/ProvenanceSection';
export { MoneySection, LimitationsSection } from './methodology/MoneySections';
export { VersionsSection, MethodologyClose } from './methodology/VersionsSection';
