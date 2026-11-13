// chatService used to train its NLP model as a side effect of being required.
// Jest's automock runs a module once to read its exports, so every test that
// mocked chatService still paid for a real training run.

const mockTrain = jest.fn();
const mockProcess = jest.fn();

jest.mock("node-nlp", () => ({
  NlpManager: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    train: mockTrain,
    process: mockProcess,
  })),
}));

describe("chatService training", () => {
  let chatService;

  beforeEach(() => {
    jest.resetModules();
    mockTrain.mockReset().mockResolvedValue(undefined);
    mockProcess.mockReset().mockResolvedValue({ intent: "greeting", score: 0.9 });
    jest.spyOn(console, "log").mockImplementation(() => {});
    chatService = require("../src/utils/chatService");
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  test("requiring the module does not train the model", () => {
    expect(mockTrain).not.toHaveBeenCalled();
  });

  test("the first message trains the model before classifying it", async () => {
    const result = await chatService.processMessage("hi");

    expect(mockTrain).toHaveBeenCalledTimes(1);
    expect(mockTrain.mock.invocationCallOrder[0]).toBeLessThan(
      mockProcess.mock.invocationCallOrder[0]
    );
    expect(result.intent).toBe("greeting");
  });

  test("messages that arrive together share one training run", async () => {
    await Promise.all([
      chatService.processMessage("a"),
      chatService.processMessage("b"),
      chatService.processMessage("c"),
    ]);
    await chatService.processMessage("d");

    expect(mockTrain).toHaveBeenCalledTimes(1);
    expect(mockProcess).toHaveBeenCalledTimes(4);
  });

  test("a failed training run is retried on the next message", async () => {
    mockTrain.mockRejectedValueOnce(new Error("boom"));

    await expect(chatService.processMessage("a")).rejects.toThrow("boom");
    await chatService.processMessage("b");

    expect(mockTrain).toHaveBeenCalledTimes(2);
  });
});
