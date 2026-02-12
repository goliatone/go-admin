package quickstart

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type binaryObjectStoreStub struct {
	payload []byte
	err     error
	lastKey string
}

func (s *binaryObjectStoreStub) GetFile(_ context.Context, path string) ([]byte, error) {
	s.lastKey = path
	if s.err != nil {
		return nil, s.err
	}
	return append([]byte{}, s.payload...), nil
}

func TestServeBinaryObjectSuccess(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("SetHeader", mock.Anything, mock.Anything).Return(ctx)
	ctx.On("Status", http.StatusOK)
	ctx.On("Send", []byte("%PDF-1.7")).Return(nil)

	store := &binaryObjectStoreStub{payload: []byte("%PDF-1.7")}
	err := ServeBinaryObject(ctx, BinaryObjectResponseConfig{
		Store:       store,
		ObjectKey:   "tenant/t-1/source.pdf",
		ContentType: "application/pdf",
		Filename:    "agreement-source.pdf",
		Disposition: "attachment",
	})

	require.NoError(t, err)
	require.Equal(t, "tenant/t-1/source.pdf", store.lastKey)
	assertHeaderCalledWith(t, ctx, "Content-Type", "application/pdf")
	assertHeaderCalledWith(t, ctx, "Content-Disposition", "attachment; filename=agreement-source.pdf")
	assertHeaderCalledWith(t, ctx, "Cache-Control", "no-store, no-cache, max-age=0, must-revalidate, private")
	assertHeaderCalledWith(t, ctx, "Pragma", "no-cache")
	ctx.AssertExpectations(t)
}

func TestServeBinaryObjectReturnsUnavailableForMissingPayload(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())

	store := &binaryObjectStoreStub{}
	err := ServeBinaryObject(ctx, BinaryObjectResponseConfig{
		Store:     store,
		ObjectKey: "tenant/t-1/source.pdf",
	})

	require.ErrorIs(t, err, ErrBinaryObjectUnavailable)
}

func TestServeBinaryObjectReturnsUnavailableForStoreErrors(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())

	store := &binaryObjectStoreStub{err: errors.New("not found")}
	err := ServeBinaryObject(ctx, BinaryObjectResponseConfig{
		Store:     store,
		ObjectKey: "tenant/t-1/source.pdf",
	})

	require.ErrorIs(t, err, ErrBinaryObjectUnavailable)
}

func TestServeBinaryObjectValidatesInputs(t *testing.T) {
	ctx := router.NewMockContext()

	err := ServeBinaryObject(nil, BinaryObjectResponseConfig{})
	require.ErrorIs(t, err, ErrBinaryObjectContextRequired)

	err = ServeBinaryObject(ctx, BinaryObjectResponseConfig{})
	require.ErrorIs(t, err, ErrBinaryObjectStoreRequired)

	err = ServeBinaryObject(ctx, BinaryObjectResponseConfig{
		Store:     &binaryObjectStoreStub{payload: []byte("x")},
		ObjectKey: " ",
	})
	require.ErrorIs(t, err, ErrBinaryObjectKeyRequired)
}

func TestServeBinaryObjectPropagatesSendErrors(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("SetHeader", mock.Anything, mock.Anything).Return(ctx)
	ctx.On("Status", http.StatusCreated)
	sendErr := errors.New("write failed")
	ctx.On("Send", []byte("hello")).Return(sendErr)

	store := &binaryObjectStoreStub{payload: []byte("hello")}
	err := ServeBinaryObject(ctx, BinaryObjectResponseConfig{
		Store:      store,
		ObjectKey:  "tenant/t-1/file.bin",
		StatusCode: http.StatusCreated,
	})

	require.ErrorIs(t, err, sendErr)
	ctx.AssertExpectations(t)
}

func assertHeaderCalledWith(t *testing.T, ctx *router.MockContext, key, value string) {
	t.Helper()
	for _, call := range ctx.Calls {
		if call.Method != "SetHeader" || len(call.Arguments) != 2 {
			continue
		}
		if call.Arguments.String(0) == key && call.Arguments.String(1) == value {
			return
		}
	}
	t.Fatalf("expected SetHeader(%q, %q), calls: %+v", key, value, ctx.Calls)
}
