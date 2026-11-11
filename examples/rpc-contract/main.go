// The sample binds only loopback by default. Tokens and the generated signing
// key are ephemeral fixture credentials, never a production login flow.
package main

//go:generate python3 verify.py --write --generate-only

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	fixture "github.com/goliatone/go-admin/quickstart/examples/rpccontract"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run() error {
	export := flag.Bool("export", false, "export the selected Go contracts to stdout without starting services")
	listen := flag.String("listen", "127.0.0.1:0", "loopback listener")
	ready := flag.String("ready", "", "write fixture endpoint and ephemeral tokens as JSON")
	flag.Parse()
	if flag.NArg() != 0 {
		return fmt.Errorf("unexpected positional arguments")
	}
	if *export {
		manifest, err := fixture.Export()
		if err != nil {
			return err
		}
		out := json.NewEncoder(os.Stdout)
		out.SetIndent("", "  ")
		return out.Encode(manifest)
	}
	address, err := net.ResolveTCPAddr("tcp", *listen)
	if err != nil {
		return err
	}
	if !address.IP.IsLoopback() {
		return fmt.Errorf("fixture listener must use a loopback IP")
	}
	var key [32]byte
	if _, err = rand.Read(key[:]); err != nil {
		return err
	}
	host, err := fixture.New(hex.EncodeToString(key[:]))
	if err != nil {
		return err
	}
	defer host.Close()
	listener, err := net.Listen("tcp", *listen)
	if err != nil {
		return err
	}
	defer listener.Close()
	stop, done, err := host.Serve(listener)
	if err != nil {
		return err
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = stop(ctx)
	}()
	token, err := host.Token("operator")
	if err != nil {
		return err
	}
	denied, err := host.Token("denied")
	if err != nil {
		return err
	}
	info := map[string]any{"readiness": host.Admin.RPCExposureReadiness(), "endpoint": "http://" + listener.Addr().String() + host.Admin.AdminAPIBasePath() + "/rpc", "token": token, "deniedToken": denied}
	data, err := json.Marshal(info)
	if err != nil {
		return err
	}
	if *ready != "" {
		if err = os.WriteFile(*ready, data, 0600); err != nil {
			return err
		}
	} else {
		fmt.Println(string(data))
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	select {
	case <-ctx.Done():
		return nil
	case err := <-done:
		return err
	}
}
