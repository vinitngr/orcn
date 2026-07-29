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
	
	err = db.AutoMigrate(&Deployment{}, &Node{}, &Job{})
	if err != nil {
		return nil, err
	}
	
	return db, nil
}