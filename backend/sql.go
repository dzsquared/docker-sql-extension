package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/labstack/echo"
	_ "github.com/microsoft/go-mssqldb"
)

type ContainerInfo struct {
	SApassword   string `json:"saPassword"`
	Port         string `json:"port"`
	Databasename string `json:"databaseName"`
}

type Database struct {
	Name string `json:"name"`
	ID   int    `json:"id"`
}

type DatabaseList struct {
	Databases []Database `json:"databases"`
}

// function to return a connection string from a ContainerInfo struct
func (c ContainerInfo) connectionString(isMaster bool) string {
	if isMaster {
		return fmt.Sprintf("server=host.docker.internal,%s;user id=sa;password=%s;database=master;trust server certificate=true", c.Port, c.SApassword)
	}
	return fmt.Sprintf("server=host.docker.internal,%s;user id=sa;password=%s;database=%s;trust server certificate=true", c.Port, c.SApassword, c.Databasename)
}

// function to generate create db statement from a ContainerInfo struct
func (c ContainerInfo) createDatabaseStatement() string {
	return fmt.Sprintf("CREATE DATABASE [%s]", c.Databasename)
}

// function to create a database in a container
func createDatabase(ctx echo.Context) error {
	// get container config from post body ContainerInput
	var containerInfo ContainerInfo
	err := ctx.Bind(&containerInfo)
	if err != nil {
		logger.Error("JSON body error: ", err)

		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	connectionString := containerInfo.connectionString(true)
	createDbString := containerInfo.createDatabaseStatement()

	db, err := sql.Open("sqlserver", connectionString)
	if err != nil {
		logger.Error("Error opening database: ", err)
		return ctx.String(http.StatusBadRequest, "Error opening database")
	}
	defer db.Close()
	dbctx := context.Background()
	err = db.PingContext(dbctx)
	if err != nil {
		logger.Error("Error pinging database: ", err)
		return ctx.String(http.StatusBadRequest, "Error pinging database")
	}

	// check if database already exists
	checkStmt := "select count(*) as dbexists from sys.databases where name = @dbname"
	rows, err := db.QueryContext(dbctx, checkStmt, sql.Named("dbname", containerInfo.Databasename))
	if err != nil {
		logger.Error("Error querying database: ", err)
		return ctx.String(http.StatusBadRequest, "Error querying server")
	}
	defer rows.Close()
	var dbexists int
	for rows.Next() {
		err := rows.Scan(&dbexists)
		if err != nil {
			logger.Error("Error accessing query results: ", err)
			return ctx.String(http.StatusBadRequest, "Error accessing query results")
		}
	}
	if dbexists > 0 {
		return ctx.String(http.StatusBadRequest, "Database already exists")
	}

	// create database
	_, dberr := db.ExecContext(dbctx, createDbString)

	if dberr != nil {
		logger.Error("Error creating database: ", dberr)
		return ctx.String(http.StatusBadRequest, "Error creating database")
	}

	// get list of databases
	queryStmt := "select [name], database_id from sys.databases where database_id > 4 or database_id = 1"
	dbRows, err := db.QueryContext(dbctx, queryStmt)
	if err != nil {
		logger.Error("Error querying database: ", err)
		return ctx.String(http.StatusBadRequest, "Error querying server")
	}
	defer dbRows.Close()

	// write results to DatabaseList struct
	var databases []Database
	for dbRows.Next() {
		var db Database
		err := dbRows.Scan(&db.Name, &db.ID)
		if err != nil {
			logger.Error("Error accessing query results: ", err)
			return ctx.String(http.StatusBadRequest, "Error accessing query results")
		}
		databases = append(databases, db)
	}
	dblist := DatabaseList{Databases: databases}

	return ctx.JSON(http.StatusOK, dblist)
}

// function to list databases in a container
func listDatabases(ctx echo.Context) error {
	// get container config from post body ContainerInput
	var containerInfo ContainerInfo
	err := ctx.Bind(&containerInfo)
	if err != nil {
		logger.Error("JSON body error: ", err)

		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	connectionString := containerInfo.connectionString(true)

	db, err := sql.Open("sqlserver", connectionString)
	if err != nil {
		logger.Error("Error opening database: ", err)
		return ctx.String(http.StatusBadRequest, "Error opening database")
	}
	defer db.Close()
	dbctx := context.Background()

	err = db.PingContext(dbctx)
	if err != nil {
		logger.Error("Error pinging database: ", err)
		return ctx.String(http.StatusBadRequest, "Error pinging database")
	}

	// get list of databases
	queryStmt := "select [name], database_id from sys.databases where database_id > 4 or database_id = 1"
	rows, err := db.QueryContext(dbctx, queryStmt)
	if err != nil {
		logger.Error("Error querying database: ", err)
		return ctx.String(http.StatusBadRequest, "Error querying server")
	}
	defer rows.Close()

	// write results to DatabaseList struct
	var databases []Database
	for rows.Next() {
		var db Database
		err := rows.Scan(&db.Name, &db.ID)
		if err != nil {
			logger.Error("Error accessing query results: ", err)
			return ctx.String(http.StatusBadRequest, "Error accessing query results")
		}
		databases = append(databases, db)
	}
	dblist := DatabaseList{Databases: databases}

	return ctx.JSON(http.StatusOK, dblist)
}
