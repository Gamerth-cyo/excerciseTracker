import React, { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import { StatusBar } from 'expo-status-bar';

type Exercises = { 
  actualReps: number, 
  totalReps: number, 
  id: string | number, 
  exerciseName: string 
};

type User = { email: string };

export default function App() {
  const [exercises, setExercises] = useState<Exercises[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercises[]>([]);
  const [visible, setVisible] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [totalReps, setTotalReps] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completedRoutines, setCompletedRoutines] = useState(0);

  // Al iniciar, se revisa si hay un usuario "logueado" en AsyncStorage
  useEffect(() => {
    const checkCurrentUser = async () => {
      const currentUser = await AsyncStorage.getItem("currentUser");
      if (currentUser) {
        setUser(JSON.parse(currentUser));
      }
    };
    checkCurrentUser();
  }, []);

  // Cuando el usuario cambia, se cargan los ejercicios asociados
  useEffect(() => {
    if (user) {
      fetchExercises(user.email);
    }
  }, [user]);

  // Obtiene la lista de ejercicios y la cantidad de rutinas completadas para el usuario dado
  const fetchExercises = async (email: string) => {
    try {
      const exercisesData = await AsyncStorage.getItem(`exercises:${email}`);
      if (exercisesData) {
        const data = JSON.parse(exercisesData);
        setCompletedRoutines(data.completedRoutines || 0);
        setExercises(data.list || []);
      } else {
        console.log('No se encontraron datos de ejercicios.');
      }
    } catch (error) {
      console.error('Error al obtener ejercicios:', error);
    }
  };

  // Guarda la lista de ejercicios y (si se pasa) el contador de rutinas completadas
  const saveExercises = async (email: string, exercisesList: Exercises[], newCompletedRoutines?: number) => {
    try {
      const currentDataStr = await AsyncStorage.getItem(`exercises:${email}`);
      let currentData = currentDataStr ? JSON.parse(currentDataStr) : { list: [], completedRoutines: 0 };
      const data = {
        list: exercisesList,
        completedRoutines: newCompletedRoutines !== undefined ? newCompletedRoutines : currentData.completedRoutines,
      };
      await AsyncStorage.setItem(`exercises:${email}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error al guardar ejercicios:', error);
    }
  };

  // Agrega un nuevo ejercicio a la lista
  const addExercise = () => {
    if (!exerciseName || !totalReps) {
      alert('Por favor completa todos los campos');
      return;
    }
    const newExercise = {
      id: Date.now(),
      exerciseName,
      totalReps: parseInt(totalReps),
      actualReps: 0,
    };
    const updatedExercises = [...exercises, newExercise];
    setExercises(updatedExercises);
    if (user) {
      saveExercises(user.email, updatedExercises);
    }
    setExerciseName('');
    setTotalReps('');
    setVisible(false);
  };

  // Actualiza las repeticiones de un ejercicio y verifica si se completó la rutina
  const updateReps = (id: string | number) => {
    const updatedExercises = exercises.map((exercise) =>
      exercise.id === id
        ? { ...exercise, actualReps: Math.min(exercise.actualReps + 10, exercise.totalReps) }
        : exercise
    );
    setExercises(updatedExercises);
    checkCompletion(updatedExercises);
  };

  // Comprueba si todos los ejercicios alcanzaron el número total de repeticiones
  // En ese caso, reinicia los contadores y actualiza las rutinas completadas
  const checkCompletion = async (updatedExercises: Exercises[]) => {
    const allCompleted = updatedExercises.every(
      (exercise) => exercise.actualReps >= exercise.totalReps
    );
    if (allCompleted) {
      setShowCompleteModal(true);
      const updatedList = updatedExercises.map((exercise) => ({
        ...exercise,
        actualReps: 0,
      }));
      let currentCompleted = 0;
      const storedDataStr = user ? await AsyncStorage.getItem(`exercises:${user.email}`) : null;
      if (storedDataStr) {
        const data = JSON.parse(storedDataStr);
        currentCompleted = data.completedRoutines || 0;
      }
      const newCompletedRoutines = currentCompleted + 1;
      setExercises(updatedList);
      if (user) {
        await saveExercises(user.email, updatedList, newCompletedRoutines);
        setCompletedRoutines(newCompletedRoutines);
      }
    }
  };

  // Maneja el registro/inicio de sesión
  const handleAuth = async (isLogin: boolean) => {
    try {
      if (isLogin) {
        // Inicio de sesión: se busca el usuario en AsyncStorage
        const storedUserStr = await AsyncStorage.getItem(`user:${email}`);
        if (!storedUserStr) {
          alert("El usuario no existe");
          return;
        }
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.password !== password) {
          alert("Contraseña incorrecta");
          return;
        }
        const userObj = { email };
        setUser(userObj);
        await AsyncStorage.setItem("currentUser", JSON.stringify(userObj));
        fetchExercises(email);
      } else {
        // Registro: se verifica que el usuario no exista y se guarda la información
        const storedUserStr = await AsyncStorage.getItem(`user:${email}`);
        if (storedUserStr) {
          alert("El usuario ya existe");
          return;
        }
        const newUser = { email, password };
        await AsyncStorage.setItem(`user:${email}`, JSON.stringify(newUser));
        const userObj = { email };
        setUser(userObj);
        await AsyncStorage.setItem("currentUser", JSON.stringify(userObj));
        await saveExercises(email, [], 0);
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Cierra sesión eliminando el usuario actual de AsyncStorage
  const logout = async () => {
    await AsyncStorage.removeItem("currentUser");
    setUser(null);
    setExercises([]);
  };

  const handleLongPress = (id: string | number) => {
    setSelectedExercises((prevSelected) => {
      const newArr = exercises.filter((exercise) => exercise.id === id);
      return [...prevSelected, ...newArr];
    });
    Vibration.vibrate(100);
  };

  const handlePress = (item: Exercises) => {
    setSelectedExercises((prevSelected) => {
      if (!prevSelected?.length) return prevSelected;
      let isSelected = false;
      prevSelected.forEach((selected) => {
        if (selected.id === item.id) isSelected = true;
      });
      if (isSelected) {
        return prevSelected.filter((selected) => selected.id !== item.id);
      }
      return [...prevSelected, item];
    });
  };

  const deleteSelected = async () => {
    const remainingExercises = exercises.filter(
      (exercise) =>
        !selectedExercises.some((selected) => selected.id === exercise.id)
    );
    setExercises(remainingExercises);
    setSelectedExercises([]);
    if (user) {
      await saveExercises(user.email, remainingExercises);
    }
  };

  const refreshSelected = async () => {
    const updatedExercises = selectedExercises.map((selected) => ({
      ...selected,
      actualReps: 0,
    }));

    const remainingExercises = exercises.map((exercise) =>
      updatedExercises.find((selected) => selected.id === exercise.id) || exercise
    );

    setExercises(remainingExercises);
    setSelectedExercises([]);
    if (user) {
      await saveExercises(user.email, remainingExercises);
    }
  };

  const isSelected = (id: string | number) => {
    return selectedExercises.some((item) => item.id === id);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar animated={true} backgroundColor="#61dafb" />
        {user ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>¡Hola, {user.email}!</Text>
              <Text style={styles.headerText}>Completed Routines: {completedRoutines}</Text>
              <Pressable onPress={logout}>
                <Ionicons name="log-out-outline" size={24} color="red" />
              </Pressable>
            </View>
            {selectedExercises.length > 0 && (
              <View style={styles.deleteBar}>
                <Text style={styles.deleteText}>
                  {selectedExercises.length} seleccionado(s)
                </Text>
                <Pressable onPress={refreshSelected}>
                  <MaterialIcons name="refresh" size={24} color="red" />
                </Pressable>
                <Pressable onPress={deleteSelected}>
                  <MaterialIcons name="delete" size={24} color="red" />
                </Pressable>
              </View>
            )}
            <FlatList
              style={styles.flatList}
              data={exercises}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onLongPress={() => handleLongPress(item.id)}
                  style={[
                    styles.exerciseItem,
                    isSelected(item.id) && styles.selectedItem,
                  ]}
                  onPress={() => handlePress(item)}
                >
                  {isSelected(item.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="blue" />
                  )}
                  <View>
                    <Text style={styles.exerciseName}>{item.exerciseName}</Text>
                    <Text style={styles.exerciseReps}>
                      {item.actualReps}/{item.totalReps} repeticiones
                    </Text>
                  </View>
                  {!isSelected(item.id) && item.actualReps !== item.totalReps ? (
                    <Pressable
                      style={styles.addRepsButton}
                      onPress={() => updateReps(item.id)}
                    >
                      <Text style={styles.addRepsText}>+10</Text>
                    </Pressable>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 24 }}>😊</Text>
                      <Icon name="check" size={20} color="green" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
            <Pressable style={styles.addButton} onPress={() => setVisible(true)}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.authContainer}>
            <Text style={styles.authTitle}>Iniciar Sesión</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Pressable onPress={() => handleAuth(true)} style={styles.logIn}>
              <Text>Iniciar Sesión </Text>
            </Pressable>
            <Pressable onPress={() => handleAuth(false)} style={styles.register}>
              <Text>Registrarse </Text>
            </Pressable>
          </View>
        )}
        <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Agregar Ejercicio</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del ejercicio"
              value={exerciseName}
              onChangeText={setExerciseName}
            />
            <TextInput
              style={styles.input}
              placeholder="Repeticiones totales"
              keyboardType="numeric"
              value={totalReps}
              onChangeText={setTotalReps}
            />
            <Button title="Guardar" onPress={addExercise} />
          </View>
        </Modal>
        <Modal
          visible={showCompleteModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCompleteModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>You did it!</Text>
              <Text style={styles.modalSubtitle}>Another routine complete!</Text>
              <Button
                title="OK!"
                onPress={() => setShowCompleteModal(false)}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    color: '#fffc',
  },
  container: {
    flex: 1,
    backgroundColor: '#202124',
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6200ee',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffcccb',
  },
  deleteText: {
    color: '#d32f2f',
    fontSize: 20,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#292a2d',
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: '#c51818',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fffc',
  },
  exerciseReps: {
    fontSize: 18,
    color: '#fffc',
  },
  addRepsButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addRepsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 60,
    height: 60,
    backgroundColor: '#6200ee',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 20,
  },
  flatList: {
    margin: 10,
  },
  logIn: {
    backgroundColor: 'dodgerblue',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  register: {
    backgroundColor: 'dodgerblue',
    padding: 10,
    borderRadius: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 20,
    marginBottom: 20,
  },
});
