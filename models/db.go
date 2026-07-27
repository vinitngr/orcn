package models

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(filepath string) error {
	db, err := gorm.Open(sqlite.Open(filepath), &gorm.Config{})
	if err != nil {
		return err
	}
	
	err = db.AutoMigrate(&Deployment{}, &Job{})
	if err != nil {
		return err
	}
	
	DB = db
	return nil
}
