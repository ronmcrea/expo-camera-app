import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Button, Image, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'expo-camera';
import { shareAsync } from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export default function App() {
  let cameraRef = useRef();
  const [hasCameraPermission, setHasCameraPermission] = useState();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState();
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState();
  const [photo, setPhoto] = useState();
  const [location, setLocation] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const Fence = 'background-location-task';

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      let { status } = await Location.requestBackgroundPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      console.log(loc);
      Location.startGeofencingAsync(Fence, [{"latitude":10.9352379,"longitude":76.7433901,"radius":1000} ]);
    })();
  }, []);

  let state = null;

  TaskManager.defineTask(Fence, ({ data: { eventType, region }, error }) => {
    if (error) {
      console.log("Error")
      return;
    }
    console.log(region);
    if (eventType === 1) {
      console.log("You are inside region");
      state = 1;
    } else if (eventType === 2) {
      console.log("You are outside region");
      state = 2;
    }
  });

  if (hasCameraPermission === undefined) {
    return <Text>Requesting permissions...</Text>
  } else if (!hasCameraPermission) {
    return <Text>Permission for camera not granted. Please change this in settings.</Text>
  }

  let text = 'Waiting..';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  let takePic = async () => {
    let options = {
      quality: 1,
      base64: true,
      exif: false
    };
    if (state === 1){  
    let newPhoto = await cameraRef.current.takePictureAsync(options);
    setPhoto(newPhoto);
    }
    else {
      console.log("You are Outside the region");
      Alert.alert('Failed!', 'You are Outside the region', [
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ]);
    }
  };

  if (photo) {
    let sharePic = () => {
      shareAsync(photo.uri).then(() => {
        setPhoto(undefined);
      });
    };

    let savePhoto = () => {
      MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
        setPhoto(undefined);
        // function convertURIToImageData(URI) {
        //   return new Promise(function(resolve, reject) {
        //     if (URI == null) return reject();
        //     var canvas = document.createElement('canvas'),
        //         context = canvas.getContext('2d'),
        //         image = new Image();
        //     image.addEventListener('load', function() {
        //       canvas.width = image.width;
        //       console.log(image.width);
        //       console.log(image.height);
        //       canvas.height = image.height;
        //       context.drawImage(image, 0, 0, canvas.width, canvas.height);
        //       ctx.fillText('Hi', 30, 30);
        //       resolve(context.getImageData(0, 0, canvas.width, canvas.height));
        //     }, false);
        //     image.src = URI;
        //   });
        // }
        // var URI = photo.uri;
        // convertURIToImageData(URI).then(function(imageData) {
        //   // Here you can use imageData
        //   console.log(imageData);
        // });
      });
    };

    return (
      <SafeAreaView style={styles.container}>
        <Image style={styles.preview} source={{ uri: "data:image/jpg;base64," + photo.base64 }} />
        <Text>{text}</Text>
        {hasMediaLibraryPermission ? <Button title="Save" onPress={savePhoto} /> : undefined}
        <Button title="Discard" onPress={() => setPhoto(undefined)} />
      </SafeAreaView>
    );
  }

  return (
    <Camera style={styles.container} ref={cameraRef} type="front">
      <View style={styles.buttonContainer}>
        <Button title="Take Pic" onPress={takePic} />
      </View>
      <StatusBar style="auto" />
    </Camera>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    backgroundColor: '#fff',
    alignSelf: 'center',
    position: 'absolute',
    bottom: 3 ,
    flexDirection: 'row',
  },
  preview: {
    alignSelf: 'stretch',
    flex: 1
  }
});