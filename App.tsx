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
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import { StatusBar } from 'expo-status-bar';
import { BarChart } from 'react-native-chart-kit';

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
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  useEffect(() => {
    const checkCurrentUser = async () => {
      const currentUser = await AsyncStorage.getItem("currentUser");
      if (currentUser) {
        setUser(JSON.parse(currentUser));
      }
    };
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchExercises(user.email);
    }
  }, [user]);

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

  const recordRoutineCompletion = async () => {
    if (!user) return;
    try {
      const currentTime = new Date().toISOString();
      let historyStr = await AsyncStorage.getItem(`routineHistory:${user.email}`);
      let history = historyStr ? JSON.parse(historyStr) : [];
      history.push(currentTime);
      await AsyncStorage.setItem(`routineHistory:${user.email}`, JSON.stringify(history));
    } catch (error) {
      console.error("Error al registrar la rutina completada:", error);
    }
  };

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

  const updateReps = (id: string | number) => {
    const updatedExercises = exercises.map((exercise) =>
      exercise.id === id
        ? { ...exercise, actualReps: Math.min(exercise.actualReps + 10, exercise.totalReps) }
        : exercise
    );
    setExercises(updatedExercises);
    
    const updatedExercise = updatedExercises.find((exercise) => exercise.id === id);
    if (updatedExercise && updatedExercise.actualReps === updatedExercise.totalReps) {
      Vibration.vibrate(500);
    }
    
    checkCompletion(updatedExercises);
  };

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
        recordRoutineCompletion();
      }
    }
  };

  const handleAuth = async (isLogin: boolean) => {
    try {
      if (isLogin) {
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
              <View style={styles.headerTop}>
                <Text style={styles.headerText}>¡Hola, {user.email}!</Text>
                <Pressable onPress={logout}>
                  <Ionicons name="log-out-outline" size={24} color="red" />
                </Pressable>
              </View>
              <View style={styles.headerBottom}>
                <Text style={styles.headerText}>
                  Rutinas Completadas: {completedRoutines}
                </Text>
              </View>
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
            {/* Botón flotante para agregar ejercicio (abajo a la derecha) */}
            <Pressable style={styles.addButton} onPress={() => setVisible(true)}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
            {/* Botón flotante para ver estadísticas (abajo a la izquierda) */}
            <Pressable
              style={styles.statsButtonFloating}
              onPress={() => setShowStatisticsModal(true)}
            >
              <Ionicons name="bar-chart-outline" size={28} color="#fff" />
            </Pressable>
            <StatisticsModal
              visible={showStatisticsModal}
              onClose={() => setShowStatisticsModal(false)}
              userEmail={user.email}
            />
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
              <Text style={styles.modalTitle}>¡Rutina Completada!</Text>
              <Text style={styles.modalSubtitle}>Otra rutina terminada.</Text>
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

const StatisticsModal = ({ visible, onClose, userEmail }: { visible: boolean, onClose: () => void, userEmail: string }) => {
  const [data, setData] = useState<{ labels: string[], datasets: { data: number[] }[] }>({ labels: [], datasets: [{ data: [] }] });
  const [selectedPeriod, setSelectedPeriod] = useState('day');

  useEffect(() => {
    const loadData = async () => {
      try {
        const historyStr = await AsyncStorage.getItem(`routineHistory:${userEmail}`);
        let history = historyStr ? JSON.parse(historyStr) : [];
        // Convertir las fechas a objetos Date
        history = history.map((item: string) => new Date(item));
        let aggregated: { [key: string]: number } = {};
        if (selectedPeriod === 'day') {
          history.forEach((date: Date) => {
            const key = date.toISOString().split('T')[0];
            aggregated[key] = (aggregated[key] || 0) + 1;
          });
        } else if (selectedPeriod === 'week') {
          history.forEach((date: Date) => {
            const key = getWeekString(date);
            aggregated[key] = (aggregated[key] || 0) + 1;
          });
        } else if (selectedPeriod === 'month') {
          history.forEach((date: Date) => {
            const key = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0');
            aggregated[key] = (aggregated[key] || 0) + 1;
          });
        } else if (selectedPeriod === 'year') {
          history.forEach((date: Date) => {
            const key = date.getFullYear().toString();
            aggregated[key] = (aggregated[key] || 0) + 1;
          });
        }
        const sortedKeys = Object.keys(aggregated).sort();
        const counts = sortedKeys.map(key => aggregated[key]);
        setData({ labels: sortedKeys, datasets: [{ data: counts }] });
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, [selectedPeriod, userEmail]);

  const getWeekString = (date: Date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return tempDate.getFullYear() + '-W' + weekNumber;
  };

  const chartConfig = {
    backgroundGradientFrom: "#1E2923",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#08130D",
    backgroundGradientToOpacity: 0.5,
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    labelFontSize: 16
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Text style={[styles.modalTitle, { fontSize: 24 }]}>
          Estadísticas de Rutinas Completadas
        </Text>
        <View style={styles.periodButtons}>
          <TouchableOpacity
            style={[
              styles.pillButton,
              selectedPeriod === 'day' && styles.pillButtonActive,
            ]}
            onPress={() => setSelectedPeriod('day')}
          >
            <Text style={[
              styles.pillButtonText,
              selectedPeriod === 'day' && styles.pillButtonTextActive
            ]}>
              Día
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pillButton,
              selectedPeriod === 'week' && styles.pillButtonActive,
            ]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[
              styles.pillButtonText,
              selectedPeriod === 'week' && styles.pillButtonTextActive
            ]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pillButton,
              selectedPeriod === 'month' && styles.pillButtonActive,
            ]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[
              styles.pillButtonText,
              selectedPeriod === 'month' && styles.pillButtonTextActive
            ]}>
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pillButton,
              selectedPeriod === 'year' && styles.pillButtonActive,
            ]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[
              styles.pillButtonText,
              selectedPeriod === 'year' && styles.pillButtonTextActive
            ]}>
              Año
            </Text>
          </TouchableOpacity>
        </View>
        <BarChart
          data={data}
          width={Dimensions.get("window").width - 16}
          height={220}
          chartConfig={chartConfig}
          style={{ marginVertical: 8, borderRadius: 16 }}
          yAxisLabel=""
          yAxisSuffix=""
        />
        <Button title="Cerrar" onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    color: '#fffc',
  },
  container: {
    flex: 1,
    backgroundColor: '#202124',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6200ee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBottom: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statsButtonFloating: {
    position: 'absolute',
    bottom: 16,
    left: 16,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#000',
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
  periodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  pillButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#6200ee',
  },
  pillButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  pillButtonTextActive: {
    color: '#fff',
  },
});
