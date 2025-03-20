export default async function embed(
  text: string,
  extractor: any
): Promise<{ embedding: number[][] }> {
  try {
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
      quantize: false,
    });

    return {
      embedding: Array.from(output.data),
    };
  } catch (error: any) {
    console.error(error);
    throw error;
  }
}
