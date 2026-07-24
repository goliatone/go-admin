package identicon

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"strconv"
)

func gridFromDigest(digest [sha256.Size]byte) [5][5]bool {
	var grid [5][5]bool
	bit := 0
	for y := range 5 {
		for x := range 3 {
			value := digest[3+bit/8]&(1<<uint(bit%8)) != 0
			grid[y][x] = value
			grid[y][4-x] = value
			bit++
		}
	}
	return grid
}

func renderPNG(digest [sha256.Size]byte, size int, palette Palette) ([]byte, error) {
	foreground, err := parseColor(palette.Foreground)
	if err != nil {
		return nil, err
	}
	background, err := parseColor(palette.Background)
	if err != nil {
		return nil, err
	}
	canvas := image.NewNRGBA(image.Rect(0, 0, size, size))
	for y := range size {
		for x := range size {
			canvas.SetNRGBA(x, y, background)
		}
	}
	grid := gridFromDigest(digest)
	cell := size / 8
	offset := (size - cell*5) / 2
	for y := range 5 {
		for x := range 5 {
			if !grid[y][x] {
				continue
			}
			for py := offset + y*cell; py < offset+(y+1)*cell; py++ {
				for px := offset + x*cell; px < offset+(x+1)*cell; px++ {
					canvas.SetNRGBA(px, py, foreground)
				}
			}
		}
	}
	var output bytes.Buffer
	encoder := png.Encoder{CompressionLevel: png.BestCompression}
	if err := encoder.Encode(&output, canvas); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func parseColor(value string) (color.NRGBA, error) {
	if !safeColor(value) {
		return color.NRGBA{}, fmt.Errorf("invalid color %q", value)
	}
	red, _ := strconv.ParseUint(value[1:3], 16, 8)
	green, _ := strconv.ParseUint(value[3:5], 16, 8)
	blue, _ := strconv.ParseUint(value[5:7], 16, 8)
	return color.NRGBA{R: byte(red), G: byte(green), B: byte(blue), A: 255}, nil
}
