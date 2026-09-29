package models

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func InitDB(filepath string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(filepath), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	
	// Resolve duplicate provider connection names before the unique
	// (organization_id, name) index is created. Rows created before the
	// constraint may collide and would otherwise abort the migration.
	if db.Migrator().HasTable(&ProviderConnection{}) &&
		db.Migrator().HasColumn(&ProviderConnection{}, "OrganizationID") {
		if err := db.Exec(`UPDATE provider_connections
			SET name = name || '-' || substr(id, 1, 8)
			WHERE rowid NOT IN (
				SELECT MIN(rowid) FROM provider_connections GROUP BY organization_id, name
			)`).Error; err != nil {
			return nil, err
		}
	}

	err = db.AutoMigrate(&Deployment{}, &Node{}, &Job{}, &Secret{}, &Template{}, &Registry{}, &RouteEndpoint{}, &ProviderConnection{}, &Organization{})
	if err != nil {
		return nil, err
	}
	
	// Ensure organization_id column exists with default for secrets (SQLite limitation)
	if !db.Migrator().HasColumn(&Secret{}, "OrganizationID") {
		if err := db.Exec("ALTER TABLE secrets ADD COLUMN organization_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'").Error; err != nil {
			return nil, err
		}
	}

	// Ensure default organization exists
	defaultOrg := Organization{
		ID:          "00000000-0000-0000-0000-000000000001",
		Name:        "default",
		Description: "Default organization for single-tenant mode",
	}
	db.FirstOrCreate(&defaultOrg, Organization{ID: defaultOrg.ID})

	return db, nil
}