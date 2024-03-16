import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.6/firebase-app.js'
import { getFirestore, collection, doc,  getDoc, addDoc, setDoc, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/9.6.6/firebase-firestore.js'
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut  } from 'https://www.gstatic.com/firebasejs/9.6.6/firebase-auth.js'

const formAddPhrase = document.querySelector('[data-js="add-phrase-form"]')
const phrasesList = document.querySelector('[data-js="phrases-list"]')
const buttonGoogle = document.querySelector('[data-js="button-google"]')
const linkLogout = document.querySelector('[data-js="logout"]')
const accountDetailsContainer = document.querySelector('[data-js="account-details"]')
const accountDetails = document.createElement('p')

const firebaseConfig = {
  apiKey: 'AIzaSyC3gHhkxzqhFX7Kg-d55f8vjp-x3uzZGEM',
  authDomain: 'fir-auth-70fdc.firebaseapp.com',
  projectId: 'fir-auth-70fdc',
  storageBucket: 'fir-auth-70fdc.appspot.com',
  messagingSenderId: '315041765978',
  appId: '1:315041765978:web:a3a98dcce56d56d6a41663',
  measurementId: 'G-8ZLHP2NN19'
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const collectionPhrases = collection(db, 'phrases')

const closeModalAddPhrases = () => {
  const modalAddPhrase = document.querySelector('[data-modal="add-phrase"]')
  M.Modal.getInstance(modalAddPhrase).close()
}

const displayError = (errorMessage) => {
  const errorDiv = document.createElement('div');
  errorDiv.textContent = errorMessage;
  errorDiv.classList.add('error-message');
  document.body.insertAdjacentElement('afterbegin', errorDiv);
  setTimeout(() => {
    errorDiv.remove()
  }, 2000);
};


const to = promise => promise
  .then(result => [null, result])
  .catch(error => [error])

const addPhrase = async (e, user) => {
  e.preventDefault()

  const [error] = await to(addDoc(collectionPhrases, {
    movieTitle: DOMPurify.sanitize(e.target.title.value),
    phrases: DOMPurify.sanitize(e.target.phrase.value),
    userId: user.uid
  }))

  if (error) {
    displayError('Nao foi possivel adicionar a frase')
    return
  }

  e.target.reset()
  closeModalAddPhrases()
}

const initCollapsibles = collapsibles => M.Collapsible.init(collapsibles)

const login = async () => {
  const provider = new GoogleAuthProvider()
  const [error] = await to( signInWithRedirect (auth, provider))

  if (error) {
    displayError('Houve um problema ao fazer o login')
  }

}

const logout = async unsubscribe => {
 const [error] = await to(signOut(auth))
 
 if (error) {
  displayError('Houve um problema ao fazer logout')
  return
 }

 unsubscribe()
}

const handleRedirectResult = async () => {
  const [error] = await to(getRedirectResult(auth))
  
  if (error) {
    displayError('Houve um problema no riderecionamento')
  }

}

const renderLinks = ({ userExists }) => {
  const lis = [...document.querySelector('[data-js="nav-ul"]').children]
    
  lis.forEach(li => {
    const liShouldBeVisible = li.dataset.js.includes(userExists ? 'logged-in' : 'logged-out')
       
    if (liShouldBeVisible) {
        li.classList.remove('hide')
         return
       }
        
      li.classList.add('hide')
    })
}

const removeLoginMessage = () => {
  const loginMessageExists = document.querySelector('[data-js="login-message"]')
  loginMessageExists?.remove()
}

const createUserDocument = async user => {
 const userDocRef = doc(db, 'users', user.uid)
 const [error, docSnapshot] = await to(getDoc(userDocRef))

 if (error) {
  displayError('Houve um problema ao tentar cadastrar o usuario')
  return
 }
 if (!docSnapshot.exists()) {
   await setDoc(userDocRef, {
     name: user.displayName,
     email: user.email,
     userId: user.uid
   })
 }
}

const renderPhrases = user => {
  const queryPhrases = query(collectionPhrases, where('userId', '==', user.uid))
  return onSnapshot(queryPhrases, snapshot => {
    const documentFragment = document.createDocumentFragment()

    snapshot.docChanges().forEach(docChange => {
      const liPhrase = document.createElement('li')
      const movieTitleContainer = document.createElement('div')
      const phraseContainer = document.createElement('div')

      const { movieTitle, phrases } =  docChange.doc.data()
      
      movieTitleContainer.textContent =  DOMPurify.sanitize(movieTitle)
      phraseContainer.textContent =  DOMPurify.sanitize(phrases)

      movieTitleContainer.setAttribute('class', 'collapsible-header blue-grey-text text-lighten-5 blue-grey darken-4')
      phraseContainer.setAttribute('class', 'collapsible-body blue-grey-text text-lighten-5 blue-grey darken-3') 
      
      liPhrase.append(movieTitleContainer, phraseContainer)
      documentFragment.append(liPhrase)
      
    })

    phrasesList.append(documentFragment)

  })
  
}

const handleSignedUser = async user => {
  createUserDocument(user)
  buttonGoogle.removeEventListener('click', login)
  formAddPhrase.onsubmit = e => addPhrase(e, user)

  const unsubscribe = renderPhrases(user)
  
  linkLogout.onclick = () => logout(unsubscribe)
  initCollapsibles(phrasesList)
  accountDetails.textContent = `${user.displayName} | ${user.email}`
  accountDetailsContainer.append(accountDetails)
}

const handleAnonymousUser = () => {
  const phrasesContainer = document.querySelector('[data-js="phrases-container"]')
  const loginMessage = document.createElement('h5')
  
  loginMessage.textContent = 'Faça login para ver as frases'
  loginMessage.classList.add('center-align', 'white-text')
  loginMessage.setAttribute('data-js', 'login-message')
  phrasesContainer.append(loginMessage)
  
  formAddPhrase.onsubmit = null
  linkLogout.onclick = null
  buttonGoogle.addEventListener('click', login)
  phrasesList.innerHTML = ''
  accountDetailsContainer.innerHTML = ''
}

const handleAuthStateChanged = async user => {
  handleRedirectResult()
  renderLinks({ userExists: !!user })
  removeLoginMessage()
    
  if (!user) { 
    handleAnonymousUser()
    return
}
  handleSignedUser({
    displayName: DOMPurify.sanitize(user.displayName),
    email: DOMPurify.sanitize(user.email),
    uid: DOMPurify.sanitize(user.uid),
  })
 
}
    
const initMolds = () => {
  const molds = document.querySelectorAll('[data-js="modal"]')
  M.Modal.init(molds)
}

onAuthStateChanged(auth, handleAuthStateChanged)

initMolds()
