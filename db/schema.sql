CREATE TABLE surveys(id BIGINT primary key,
	'surveyId' INT,
	'creator' INT,
	'date' DATETIME,
	'project' TEXT,
	'status' TEXT
	);

CREATE INDEX "ix_survey_index" ON surveys ("id");

CREATE TABLE INVESTIGATORS(id INT primary key,
	'primaryInvestigator' TEXT not null,
	'investigator1' TEXT,
	'investigator2' TEXT,
	'investigator3' TEXT
	);
CREATE INDEX "ix_investigators_index" ON INVESTIGATORS("id");


CREATE TABLE ESO(esoid INT primary key,
	'programID' TEXT,
	'observationBlockID' TEXT
	);
CREATE INDEX "ix_eso_index" ON ESO("esoid");


CREATE TABLE HISTORY(esoid INT primary key,
	date DATETIME,
	status TEXT
);

CREATE TABLE OBSERVATIONBLOCKS(esoid INT primary key,
	'currentQCstatus' TEXT,
	'currentStatus' TEXT,
	'executionTime' INT,
	'instrument' TEXT,
	'nbpawprints' INT,
	'period' INT,
	'programID' TEXT,
	'runID' INT,
	'telescope' INT,
	'tilePattern' TEXT,
	'userPriority' INT
);

CREATE TABLE COVERAGE(esoid INT primary key,
	'topr1' REAL,
	'topr2' REAL,
	'topl1' REAL,
	'topl2' REAL,
	'bottomr1' REAL,
	'bottomr2' REAL,
	'bottoml1' REAL,
	'bottoml2' REAL
);