package app

import (
	"fmt"
	"log"
	"net"

	"github.com/urfave/cli"
)

func Generate() *cli.App {
	app := cli.NewApp()
	app.Name = "A golang simples command line interface"
	app.Usage = "Search for IPs and servers name on the web"

	app.Commands = []cli.Command{
		{
			Name:  "ip",
			Usage: "Search for IP address",
			Flags: []cli.Flag{
				cli.StringFlag{
					Name:  "host",
					Value: "google.com",
				},
			},
			Action: func(c *cli.Context) {
				host := c.String("host")

				ips, erro := net.LookupIP(host)
				if erro != nil {
					log.Fatal(erro)
				}

				for _, ip := range ips {
					fmt.Println(ip)
				}
			},
		},
		{
			Name:  "server",
			Usage: "Search for server name",
			Flags: []cli.Flag{
				cli.StringFlag{
					Name: "host",
				},
			},
			Action: func(c *cli.Context) {
				host := c.String("host")

				servers, erro := net.LookupNS(host)
				if erro != nil {
					log.Fatal(erro)
				}

				for _, server := range servers {
					fmt.Println(*server)
				}
			},
		},
	}
	return app
}
