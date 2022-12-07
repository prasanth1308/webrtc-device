export const getScreenTracksForSharing = async () => {
  const mediaStream = await getLocalScreenCaptureStream();

  const screenTrack = mediaStream.getVideoTracks()[0];

  return screenTrack;
};

export const getLocalScreenCaptureStream = async () => {
  try {
    const constraints = { video: { cursor: "always" }, audio: false };
    const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(
      constraints
    );

    return screenCaptureStream;
  } catch (error) {
    console.error("failed to get local screen", error);
  }
};
