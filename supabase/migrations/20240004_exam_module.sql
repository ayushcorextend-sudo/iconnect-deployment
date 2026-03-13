-- Exam / MCQ module

CREATE TABLE IF NOT EXISTS exam_subjects (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  icon        text DEFAULT '📚',
  question_count int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  int REFERENCES exam_subjects(id) ON DELETE CASCADE,
  question    text NOT NULL,
  option_a    text NOT NULL,
  option_b    text NOT NULL,
  option_c    text NOT NULL,
  option_d    text NOT NULL,
  correct     char(1) NOT NULL CHECK (correct IN ('A','B','C','D')),
  explanation text DEFAULT '',
  difficulty  text DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  source      text DEFAULT 'NEET-PG',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  int REFERENCES exam_subjects(id) ON DELETE CASCADE,
  score       int NOT NULL DEFAULT 0,
  total       int NOT NULL DEFAULT 0,
  answers     jsonb DEFAULT '[]',
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE exam_subjects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "exam_subjects_read"   ON exam_subjects  FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "exam_questions_read"  ON exam_questions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "exam_attempts_own"    ON exam_attempts  FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed subjects
INSERT INTO exam_subjects (name, icon) VALUES
  ('Anatomy', '🦴'),
  ('Physiology', '❤️'),
  ('Biochemistry', '🧬'),
  ('Pathology', '🔬'),
  ('Pharmacology', '💊'),
  ('Microbiology', '🦠'),
  ('Community Medicine', '🏘️'),
  ('Internal Medicine', '🩺'),
  ('Surgery', '🔪'),
  ('Obstetrics & Gynaecology', '👶')
ON CONFLICT DO NOTHING;

-- Seed 60 sample NEET-PG MCQs (6 per subject)
INSERT INTO exam_questions (subject_id, question, option_a, option_b, option_c, option_d, correct, explanation, difficulty, source)
SELECT s.id, q.question, q.a, q.b, q.c, q.d, q.correct, q.explanation, q.difficulty, 'NEET-PG'
FROM exam_subjects s
JOIN (VALUES
  -- Anatomy (subject 1)
  ('Anatomy', 'Which nerve supplies the skin over the medial aspect of the elbow?', 'Medial cutaneous nerve of arm', 'Medial cutaneous nerve of forearm', 'Ulnar nerve', 'Intercostobrachial nerve', 'B', 'The medial cutaneous nerve of forearm (medial antebrachial cutaneous) supplies the medial forearm including skin over medial elbow.', 'medium'),
  ('Anatomy', 'Surgical neck of humerus fracture most commonly injures which nerve?', 'Ulnar nerve', 'Radial nerve', 'Axillary nerve', 'Musculocutaneous nerve', 'C', 'Axillary nerve winds around surgical neck of humerus and is most at risk in surgical neck fractures.', 'easy'),
  ('Anatomy', 'Coronary sinus drains into the:', 'Right atrium', 'Left atrium', 'Right ventricle', 'Left ventricle', 'A', 'Coronary sinus opens into the right atrium between the opening of IVC and the right atrioventricular orifice.', 'easy'),
  ('Anatomy', 'Which muscle is the chief extensor of the vertebral column?', 'Iliocostalis', 'Erector spinae', 'Multifidus', 'Semispinalis', 'B', 'Erector spinae (sacrospinalis) is the chief extensor of the vertebral column and is divided into iliocostalis, longissimus, and spinalis.', 'medium'),
  ('Anatomy', 'The transpyloric plane of Addison passes through which vertebral level?', 'L1', 'L2', 'T12', 'L3', 'A', 'The transpyloric plane lies at the level of L1, midway between the suprasternal notch and pubic symphysis.', 'hard'),
  ('Anatomy', 'Femoral ring is bounded laterally by:', 'Femoral vein', 'Lacunar ligament', 'Inguinal ligament', 'Femoral artery', 'A', 'Femoral ring boundaries: anteriorly-inguinal ligament, posteriorly-pectineus, medially-lacunar ligament, laterally-femoral vein.', 'medium'),

  -- Physiology (subject 2)
  ('Physiology', 'The oxygen dissociation curve shifts to the right in:', 'Alkalosis', 'Decreased temperature', 'Increased 2,3 DPG', 'Decreased PCO2', 'C', 'Increased 2,3-DPG, decreased pH (acidosis), increased PCO2, and fever shift the ODC to the right (Bohr effect), facilitating O2 release.', 'medium'),
  ('Physiology', 'Normal GFR in a healthy adult is approximately:', '50 mL/min', '125 mL/min', '200 mL/min', '75 mL/min', 'B', 'Normal GFR is approximately 125 mL/min (180 L/day) in a healthy 70 kg adult.', 'easy'),
  ('Physiology', 'Which of the following is a fast-twitch muscle fibre?', 'Type I', 'Type IIa', 'Type IIb', 'Both B and C', 'D', 'Type IIa (fast oxidative-glycolytic) and Type IIb (fast glycolytic) are both fast-twitch fibres. Type I are slow-twitch.', 'medium'),
  ('Physiology', 'The resting membrane potential of a neuron is approximately:', '-35 mV', '-55 mV', '-70 mV', '-90 mV', 'C', 'The resting membrane potential of a typical neuron is approximately -70 mV, maintained by the Na+/K+ ATPase pump and K+ leak channels.', 'easy'),
  ('Physiology', 'Surfactant is produced by:', 'Type I pneumocytes', 'Type II pneumocytes', 'Clara cells', 'Alveolar macrophages', 'B', 'Pulmonary surfactant (dipalmitoylphosphatidylcholine/DPPC) is produced by Type II pneumocytes and reduces surface tension in alveoli.', 'easy'),
  ('Physiology', 'Which phase of the cardiac cycle has the longest duration?', 'Isovolumetric contraction', 'Ejection phase', 'Isovolumetric relaxation', 'Diastolic filling', 'D', 'Diastolic filling (ventricular diastole) is the longest phase of the cardiac cycle, approximately 500 ms at a heart rate of 75 bpm.', 'medium'),

  -- Biochemistry (subject 3)
  ('Biochemistry', 'The rate-limiting enzyme of glycolysis is:', 'Hexokinase', 'Phosphofructokinase-1', 'Pyruvate kinase', 'Phosphoglucose isomerase', 'B', 'PFK-1 is the key regulatory enzyme of glycolysis, inhibited by ATP/citrate and activated by AMP/ADP/F-2,6-BP.', 'easy'),
  ('Biochemistry', 'HbA1c reflects average blood glucose over:', '2-4 weeks', '1-2 months', '2-3 months', '4-6 months', 'C', 'HbA1c reflects glycaemic control over the preceding 2-3 months (lifespan of RBC ~120 days).', 'easy'),
  ('Biochemistry', 'Phenylketonuria is caused by deficiency of:', 'Phenylalanine hydroxylase', 'Homogentisate oxidase', 'Fumarylacetoacetase', 'Tyrosinase', 'A', 'PKU is an autosomal recessive disorder caused by deficiency of phenylalanine hydroxylase, leading to accumulation of phenylalanine.', 'easy'),
  ('Biochemistry', 'Which vitamin is involved in one-carbon transfer reactions?', 'Vitamin B1', 'Vitamin B6', 'Folic acid', 'Vitamin B12', 'C', 'Folic acid (as tetrahydrofolate/THF) is the main carrier of one-carbon units required for purine and pyrimidine synthesis.', 'medium'),
  ('Biochemistry', 'The urea cycle occurs in which organ?', 'Kidney', 'Liver', 'Muscle', 'Small intestine', 'B', 'The urea cycle (ornithine cycle) occurs primarily in the liver, converting toxic ammonia to urea for excretion.', 'easy'),
  ('Biochemistry', 'Biotin is a cofactor for:', 'Pyruvate decarboxylase', 'Pyruvate carboxylase', 'Transketolase', 'Glutathione peroxidase', 'B', 'Biotin is a cofactor for carboxylation reactions including pyruvate carboxylase, acetyl-CoA carboxylase, and propionyl-CoA carboxylase.', 'medium'),

  -- Pathology (subject 4)
  ('Pathology', 'Reed-Sternberg cells are diagnostic of:', 'Burkitt lymphoma', 'Hodgkin lymphoma', 'Non-Hodgkin lymphoma', 'Multiple myeloma', 'B', 'Reed-Sternberg cells (owl-eye appearance) are the pathognomonic giant binucleated cells of Hodgkin lymphoma.', 'easy'),
  ('Pathology', 'Virchow triad includes all EXCEPT:', 'Hypercoagulability', 'Endothelial injury', 'Stasis of blood flow', 'Increased fibrinolysis', 'D', 'Virchow triad: endothelial injury, stasis/turbulence, hypercoagulability. Increased fibrinolysis is not part of this triad.', 'medium'),
  ('Pathology', 'Amyloid stains with which dye?', 'PAS', 'Congo red', 'Prussian blue', 'Masson trichrome', 'B', 'Amyloid stains with Congo red and shows apple-green birefringence under polarized light.', 'easy'),
  ('Pathology', 'Caseous necrosis is characteristically seen in:', 'Ischaemic infarct', 'Tuberculosis', 'Gangrene', 'Fat necrosis', 'B', 'Caseous necrosis is the hallmark of tuberculosis — a cheesy, soft, friable necrosis with loss of cell architecture.', 'easy'),
  ('Pathology', 'The p53 gene is located on chromosome:', '13q14', '17p13', '5q21', '18q21', 'B', 'TP53 (tumor suppressor gene) is located on chromosome 17p13 and is the most commonly mutated gene in human cancers.', 'medium'),
  ('Pathology', 'Mallory-Denk bodies are seen in:', 'Wilson disease', 'Alcoholic hepatitis', 'Viral hepatitis A', 'Primary biliary cirrhosis', 'B', 'Mallory-Denk bodies (alcoholic hyaline) are eosinophilic intracytoplasmic inclusions seen in alcoholic hepatitis.', 'medium'),

  -- Pharmacology (subject 5)
  ('Pharmacology', 'Drug of choice for status epilepticus is:', 'Phenytoin IV', 'Diazepam IV', 'Phenobarbitone IM', 'Valproate IV', 'B', 'IV diazepam (benzodiazepine) is the first-line drug for status epilepticus due to rapid onset of action.', 'easy'),
  ('Pharmacology', 'Methotrexate acts by inhibiting:', 'Dihydropteroate synthase', 'Dihydrofolate reductase', 'Thymidylate synthase', 'Serine hydroxymethyltransferase', 'B', 'Methotrexate is a folate antagonist that inhibits dihydrofolate reductase (DHFR), blocking THF synthesis.', 'medium'),
  ('Pharmacology', 'Which beta-blocker has intrinsic sympathomimetic activity (ISA)?', 'Atenolol', 'Metoprolol', 'Pindolol', 'Propranolol', 'C', 'Pindolol (and acebutolol) have intrinsic sympathomimetic activity — they are partial agonists at beta receptors.', 'hard'),
  ('Pharmacology', 'Zero-order kinetics applies to which drug at therapeutic doses?', 'Penicillin', 'Aspirin', 'Phenytoin', 'Ethanol', 'D', 'Ethanol follows zero-order kinetics — a fixed amount is metabolized per unit time regardless of plasma concentration.', 'medium'),
  ('Pharmacology', 'Therapeutic drug monitoring is most essential for:', 'Ibuprofen', 'Amoxicillin', 'Digoxin', 'Azithromycin', 'C', 'Digoxin has a narrow therapeutic index and requires TDM to avoid toxicity; target serum level 0.5-2 ng/mL.', 'easy'),
  ('Pharmacology', 'Lignocaine is classified as which class of antiarrhythmic?', 'Class IA', 'Class IB', 'Class IC', 'Class II', 'B', 'Lignocaine (lidocaine) is a Class IB antiarrhythmic — sodium channel blocker that decreases automaticity preferentially in ischaemic tissue.', 'medium'),

  -- Microbiology (subject 6)
  ('Microbiology', 'Gram-negative diplococci causing meningitis is:', 'Streptococcus pneumoniae', 'Neisseria meningitidis', 'Haemophilus influenzae', 'Listeria monocytogenes', 'B', 'Neisseria meningitidis is a gram-negative diplococcus and the leading cause of bacterial meningitis in older children and young adults.', 'easy'),
  ('Microbiology', 'Weil-Felix test is used to diagnose:', 'Typhoid', 'Rickettsial infections', 'Brucellosis', 'Leptospirosis', 'B', 'Weil-Felix test detects antibodies to Proteus antigens (OX-2, OX-19, OX-K) that cross-react with Rickettsia species.', 'medium'),
  ('Microbiology', 'The vaccine-preventable disease caused by Bordetella pertussis is:', 'Diphtheria', 'Whooping cough', 'Tetanus', 'Measles', 'B', 'Bordetella pertussis causes whooping cough (pertussis), prevented by DPT/DTaP vaccination.', 'easy'),
  ('Microbiology', 'ELISA is used as a screening test for:', 'Hepatitis B surface antigen', 'HIV antibodies', 'Both A and B', 'Malaria antigen', 'C', 'ELISA is the standard screening test for HIV antibodies (anti-HIV ELISA) and HBsAg for hepatitis B.', 'medium'),
  ('Microbiology', 'KOH mount preparation is used to detect:', 'Bacteria', 'Fungi', 'Protozoa', 'Viruses', 'B', 'KOH (10-20%) mount dissolves keratinous material and is used to detect fungal elements (hyphae and spores).', 'easy'),
  ('Microbiology', 'Bacterial spores are best killed by:', 'Boiling at 100°C', 'Autoclaving at 121°C', 'Pasteurisation', 'UV radiation', 'B', 'Autoclaving (moist heat at 121°C, 15 psi, 15-20 min) is the most reliable method to kill bacterial endospores.', 'easy'),

  -- Community Medicine (subject 7)
  ('Community Medicine', 'Herd immunity threshold depends on:', 'Attack rate', 'Basic reproduction number (R0)', 'Case fatality rate', 'Secondary attack rate', 'B', 'Herd immunity threshold = 1 - (1/R0). R0 is the basic reproduction number — average secondary cases from one case.', 'medium'),
  ('Community Medicine', 'Odds ratio is used in:', 'Cohort study', 'Randomised controlled trial', 'Case-control study', 'Cross-sectional study', 'C', 'Odds ratio is the measure of association used in case-control studies; relative risk is used in cohort studies.', 'easy'),
  ('Community Medicine', 'The national nutritional standard for protein requirement in adult Indian male (ICMR) is:', '0.8 g/kg/day', '1.0 g/kg/day', '60 g/day', '0.5 g/kg/day', 'C', 'ICMR recommends 60 g/day of protein for a 60 kg reference Indian adult male (1 g/kg/day).', 'medium'),
  ('Community Medicine', 'ASHA is a programme under:', 'NRHM', 'ICDS', 'Family Welfare Programme', 'National TB Programme', 'A', 'ASHA (Accredited Social Health Activist) is a key component of the National Rural Health Mission (NRHM)/NHM.', 'easy'),
  ('Community Medicine', 'Incubation period of cholera is:', '1-5 days', '2-4 weeks', '1-2 hours', '6 hours to 5 days', 'D', 'Incubation period of Vibrio cholerae is typically 6 hours to 5 days (usually 1-2 days).', 'medium'),
  ('Community Medicine', 'The Integrated Child Development Services (ICDS) scheme provides supplementary nutrition to children up to:', '3 years', '6 years', '5 years', '2 years', 'B', 'ICDS targets children from 0-6 years with supplementary nutrition, immunisation, health check-up and pre-school education.', 'easy'),

  -- Internal Medicine (subject 8)
  ('Internal Medicine', 'Which cardiac enzyme is the most specific marker for myocardial infarction?', 'CK-MB', 'Troponin I', 'LDH', 'Myoglobin', 'B', 'Cardiac troponin I (cTnI) and troponin T (cTnT) are the most cardiac-specific biomarkers for myocardial injury.', 'easy'),
  ('Internal Medicine', 'The classic triad of DKA includes all EXCEPT:', 'Hyperglycaemia', 'Metabolic acidosis', 'Ketosis', 'Hyperosmolarity without ketosis', 'D', 'DKA triad: hyperglycaemia (>250 mg/dL), anion-gap metabolic acidosis, ketosis. Hyperosmolarity without ketosis is HHS.', 'medium'),
  ('Internal Medicine', 'Gold standard for diagnosing pulmonary embolism is:', 'D-dimer', 'CT pulmonary angiography', 'Ventilation-perfusion scan', 'Pulmonary angiography', 'D', 'Conventional pulmonary angiography remains the gold standard, though CTPA is the investigation of choice in practice.', 'hard'),
  ('Internal Medicine', 'Which finding is pathognomonic of infective endocarditis?', 'Fever', 'Janeway lesions', 'Osler nodes', 'Splinter haemorrhages', 'C', 'Osler nodes (tender nodules on fingertips) are specific to infective endocarditis. Janeway lesions (non-tender) are also seen.', 'hard'),
  ('Internal Medicine', 'HbA1c target for most adults with Type 2 DM (ADA guideline) is:', '<6%', '<7%', '<8%', '<9%', 'B', 'ADA guidelines recommend an HbA1c target of <7% (<53 mmol/mol) for most non-pregnant adults with T2DM.', 'easy'),
  ('Internal Medicine', 'Lupus anticoagulant paradoxically causes:', 'Bleeding tendency', 'Thrombotic tendency', 'No coagulation change', 'Decreased PT only', 'B', 'Lupus anticoagulant prolongs APTT in vitro but causes thrombosis in vivo — a paradox explained by endothelial and platelet activation.', 'hard'),

  -- Surgery (subject 9)
  ('Surgery', 'Cullen sign is seen in:', 'Acute appendicitis', 'Acute pancreatitis', 'Perforation peritonitis', 'Strangulated hernia', 'B', 'Cullen sign (periumbilical ecchymosis) indicates retroperitoneal haemorrhage, classically in severe acute pancreatitis.', 'medium'),
  ('Surgery', 'Meckel diverticulum is a remnant of:', 'Vitello-intestinal duct', 'Urachus', 'Thyroglossal duct', 'Branchial arch', 'A', 'Meckel diverticulum is a true diverticulum — a remnant of the vitello-intestinal (omphalomesenteric) duct, found 2 feet from the ileocaecal valve.', 'easy'),
  ('Surgery', 'Investigation of choice for acute cholecystitis is:', 'Plain X-ray abdomen', 'HIDA scan', 'USG abdomen', 'CT abdomen', 'C', 'USG abdomen is the investigation of choice for acute cholecystitis — detects gallstones, wall thickening, and pericholecystic fluid.', 'easy'),
  ('Surgery', 'Which suture material should NOT be used in contaminated wounds?', 'Monofilament nylon', 'Polyglycolic acid (PGA)', 'Polypropylene', 'Braided multifilament', 'D', 'Braided multifilament sutures (silk, braided PGA) should be avoided in contaminated wounds as bacteria harbour in interstices.', 'hard'),
  ('Surgery', 'Buerger disease (Thromboangiitis obliterans) primarily affects:', 'Elderly hypertensive males', 'Young male smokers', 'Post-menopausal women', 'Diabetic patients', 'B', 'Buerger disease affects young male heavy smokers (<40 years) causing inflammatory occlusion of small and medium arteries.', 'easy'),
  ('Surgery', 'Whipple procedure (pancreaticoduodenectomy) is indicated for:', 'Carcinoma head of pancreas', 'Carcinoma body of pancreas', 'Insulinoma', 'Pseudopancreatic cyst', 'A', 'Whipple''s operation is the standard curative surgery for resectable adenocarcinoma of the head of pancreas.', 'easy'),

  -- Obstetrics & Gynaecology (subject 10)
  ('Obstetrics & Gynaecology', 'Physiological basis of placenta praevia diagnosis by USG is:', 'Migration of placenta', 'Elongation of lower uterine segment', 'Resorption of placenta', 'Hypertrophy of fundus', 'B', 'Apparent migration of low-lying placenta is due to elongation and development of the lower uterine segment, not actual movement of placenta.', 'hard'),
  ('Obstetrics & Gynaecology', 'Bishop score assesses:', 'Foetal maturity', 'Cervical favourability for induction', 'Pelvi-foetal proportion', 'Amniotic fluid index', 'B', 'Bishop score evaluates: cervical dilation, effacement, station, consistency, and position — used to predict successful induction.', 'easy'),
  ('Obstetrics & Gynaecology', 'The most common cause of postpartum haemorrhage is:', 'Retained placenta', 'Uterine atony', 'Cervical tear', 'Coagulation disorders', 'B', 'Uterine atony (failure of uterus to contract after delivery) accounts for ~80% of PPH cases.', 'easy'),
  ('Obstetrics & Gynaecology', 'HELLP syndrome is a complication of:', 'Gestational diabetes', 'Severe pre-eclampsia', 'Hyperemesis gravidarum', 'Placenta praevia', 'B', 'HELLP (Haemolysis, Elevated Liver enzymes, Low Platelets) is a life-threatening complication of severe pre-eclampsia/eclampsia.', 'medium'),
  ('Obstetrics & Gynaecology', 'Treatment of choice for ectopic pregnancy in haemodynamically stable patient is:', 'Surgery', 'Methotrexate', 'Expectant management', 'Mifepristone', 'B', 'Single-dose methotrexate (50 mg/m²) is the medical treatment of choice for stable ectopic pregnancy with specific criteria.', 'medium'),
  ('Obstetrics & Gynaecology', 'The normal amniotic fluid index (AFI) at term is:', '2-5 cm', '5-25 cm', '10-20 cm', '25-30 cm', 'B', 'Normal AFI at term is 5-25 cm. <5 cm = oligohydramnios, >25 cm = polyhydramnios.', 'medium')
) AS q(subject, question, a, b, c, d, correct, explanation, difficulty)
ON s.name = q.subject;

-- Update question counts
UPDATE exam_subjects s
SET question_count = (SELECT COUNT(*) FROM exam_questions q WHERE q.subject_id = s.id);
